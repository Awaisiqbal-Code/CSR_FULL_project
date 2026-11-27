"""Stable WhatsApp-JID conversation identity + one-time re-key/split migration.

A conversation's identity should be the WhatsApp JID (e.g. 923001234567@c.us, or
<id>@g.us for a group), NOT the contact display name — two different contacts who
share a name ("Hammad" / "Hammad") must stay separate, and a name-keyed merge must
be splittable back apart.

The JID is embedded in WhatsApp message source ids of the legacy serialized form
`true_/false_<jid>_<hex>`. Current builds also emit a *bare* hex id with no JID; a
message (or a whole chat) with only bare ids yields no JID, so it keeps its existing
name-based key — this migration never guesses an identity it cannot prove.

Everything here is pure / DB-session based so it is unit-tested without live WhatsApp.
"""
from __future__ import annotations
import re
import hashlib

# true_/false_<jid>_<hex>, where <jid> ends in @c.us (1:1), @g.us (group) or @lid.
# The JID itself contains no underscore before the @, so a non-greedy, underscore-
# free capture is unambiguous even though the whole id has further `_<hex>` parts.
_JID_RE = re.compile(r'^(?:true|false)_([^_\s|@]+@(?:c\.us|g\.us|lid))', re.I)


def chat_jid_from_source(source_id) -> str | None:
    """The chat JID carried by a message source id, lower-cased, or None."""
    m = _JID_RE.match(str(source_id or '').strip())
    return m.group(1).lower() if m else None


def external_key_for(identity: str) -> str:
    """sha256 of the casefolded identity — the exact scheme Conversation.external_key
    uses in the live sync (so a JID key computed here matches one computed there)."""
    return hashlib.sha256((identity or '').strip().casefold().encode('utf-8')).hexdigest()


def key_from_chat(jid: str | None, chat_id: str = '', title: str = '') -> str:
    """Conversation key: the JID when known, else the collector id, else the title."""
    return external_key_for(jid or chat_id or title or '')


def group_messages_by_jid(messages) -> dict[str | None, list]:
    """Partition message objects by their source-id JID. The None bucket holds
    messages whose id carries no JID (bare hex / missing)."""
    buckets: dict[str | None, list] = {}
    for m in messages:
        jid = chat_jid_from_source(getattr(m, 'source_message_id', '') or '')
        buckets.setdefault(jid, []).append(m)
    return buckets


def plan_conversation(conv_id, external_key, messages):
    """Decide what should happen to one conversation, from its messages' JIDs.

    Returns a dict describing the action (never mutates anything):
      - {'action': 'none'}                         no JID evidence, or already correct
      - {'action': 'rekey', 'jid', 'new_key'}      single JID, key should become it
      - {'action': 'split', 'keep_jid', 'keep_key',
         'moves': [{'jid','new_key','message_ids'}]}  name-merged: split other JIDs out

    The conversation KEEPS the dominant JID (most messages); messages with no JID stay
    with it (we cannot prove they belong elsewhere). Ties break by sorted JID for
    determinism / idempotency.
    """
    buckets = group_messages_by_jid(messages)
    jids = sorted(j for j in buckets if j)
    if not jids:
        return {'action': 'none'}
    # Deterministic dominant: most messages, then lexicographically smallest JID.
    dominant = min(jids, key=lambda j: (-len(buckets[j]), j))
    keep_key = external_key_for(dominant)
    others = [j for j in jids if j != dominant]
    if not others:
        if external_key == keep_key:
            return {'action': 'none'}
        return {'action': 'rekey', 'jid': dominant, 'new_key': keep_key}
    moves = [{'jid': j, 'new_key': external_key_for(j),
              'message_ids': [getattr(m, 'id') for m in buckets[j]]} for j in others]
    return {'action': 'split', 'keep_jid': dominant, 'keep_key': keep_key, 'moves': moves}


def number_from_jid(jid: str | None) -> str:
    """The phone number from a 1:1 @c.us JID (groups/@lid have none)."""
    if jid and jid.endswith('@c.us'):
        num = jid.split('@', 1)[0]
        if num.isdigit():
            return num
    return ''


# --------------------------------------------------------------------------
# One-time migration. Idempotent and additive: it re-keys conversations to their
# JID and splits name-merged ones; it never deletes a real message (only exact
# fingerprint duplicates created by a merge). dry_run=True reports intended changes
# without writing. Run via the admin endpoint once after deploy.
# --------------------------------------------------------------------------

def _delete_message(db, m):
    from sqlalchemy import select
    from .models import VoiceAsset
    va = db.scalar(select(VoiceAsset).where(VoiceAsset.message_id == m.id))
    if va:
        db.delete(va)
    db.delete(m)


def _move_messages(db, message_rows, target, report):
    """Move messages to target, dropping any that collide on (target, fingerprint)."""
    from sqlalchemy import select
    from .models import Message
    for m in message_rows:
        dup = db.scalar(select(Message).where(
            Message.conversation_id == target.id, Message.fingerprint == m.fingerprint,
            Message.id != m.id))
        if dup is not None:
            _delete_message(db, m)
            report['duplicates_removed'] += 1
        else:
            m.conversation_id = target.id
            report['messages_moved'] += 1


def migrate_identity(db, *, dry_run: bool = True) -> dict:
    """Re-key conversations by WhatsApp JID and split name-merged ones. Returns a
    report. Idempotent: a second run makes no further changes."""
    from sqlalchemy import select
    from .models import Conversation, Message
    report = {'dry_run': dry_run, 'conversations': 0, 'rekeyed': 0, 'split': 0,
              'new_conversations': 0, 'messages_moved': 0, 'duplicates_removed': 0,
              'merged_into_existing': 0, 'skipped_no_jid': 0, 'unchanged': 0}
    convs = db.scalars(select(Conversation)).all()
    report['conversations'] = len(convs)
    for conv in convs:
        msgs = db.scalars(select(Message).where(Message.conversation_id == conv.id)).all()
        plan = plan_conversation(conv.id, conv.external_key, msgs)
        if plan['action'] == 'none':
            if any(chat_jid_from_source(getattr(m, 'source_message_id', '')) for m in msgs):
                report['unchanged'] += 1
            else:
                report['skipped_no_jid'] += 1
            continue
        if plan['action'] == 'rekey':
            _apply_rekey(db, conv, plan['jid'], plan['new_key'], report, dry_run)
        elif plan['action'] == 'split':
            _apply_rekey(db, conv, plan['keep_jid'], plan['keep_key'], report, dry_run)
            by_id = {getattr(m, 'id'): m for m in msgs}
            for mv in plan['moves']:
                rows = [by_id[i] for i in mv['message_ids'] if i in by_id]
                _apply_move(db, conv, mv['jid'], mv['new_key'], rows, report, dry_run)
            report['split'] += 1
    if not dry_run:
        db.commit()
    return report


def _apply_rekey(db, conv, jid, new_key, report, dry_run):
    from sqlalchemy import select
    from .models import Conversation, Message
    if conv.external_key == new_key:
        return
    existing = db.scalar(select(Conversation).where(
        Conversation.employee_id == conv.employee_id,
        Conversation.external_key == new_key, Conversation.id != conv.id))
    if existing is not None:
        # The real JID conversation already exists: merge this one's messages into it.
        report['merged_into_existing'] += 1
        if not dry_run:
            rows = db.scalars(select(Message).where(Message.conversation_id == conv.id)).all()
            _move_messages(db, rows, existing, report)
            db.flush()
            db.delete(conv)
        return
    report['rekeyed'] += 1
    if not dry_run:
        conv.external_key = new_key
        num = number_from_jid(jid)
        if num and not conv.contact_number:
            conv.contact_number = num


def _apply_move(db, src_conv, jid, new_key, message_rows, report, dry_run):
    from sqlalchemy import select
    from .models import Conversation
    target = db.scalar(select(Conversation).where(
        Conversation.employee_id == src_conv.employee_id,
        Conversation.external_key == new_key))
    if target is None:
        report['new_conversations'] += 1
        if dry_run:
            report['messages_moved'] += len(message_rows)
            return
        target = Conversation(employee_id=src_conv.employee_id, external_key=new_key,
                              title=src_conv.title, contact_number=number_from_jid(jid),
                              state='unclassified')
        db.add(target)
        db.flush()
    if dry_run:
        report['messages_moved'] += len(message_rows)
        return
    _move_messages(db, message_rows, target, report)
