"""Stable WhatsApp-JID conversation identity + re-key/split migration.
Pure helpers need no DB; the migration runs on in-memory SQLite (no real data)."""
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import jid_identity as ji
from app.db import Base
from app.models import User, Conversation, Message, VoiceAsset


# --- pure helpers ----------------------------------------------------------

def test_chat_jid_from_source():
    assert ji.chat_jid_from_source('false_923001234567@c.us_ABCDEF') == '923001234567@c.us'
    assert ji.chat_jid_from_source('true_923001234567@c.us_3EB0') == '923001234567@c.us'
    assert ji.chat_jid_from_source('false_120363012345@g.us_HEX') == '120363012345@g.us'
    # Current bare-hex ids carry no JID.
    assert ji.chat_jid_from_source('ACE35E5AFAC83EB2A263D388FF64AC1A') is None
    assert ji.chat_jid_from_source('') is None
    assert ji.chat_jid_from_source(None) is None


def test_key_scheme_matches_live_sync():
    import hashlib
    jid = '923001234567@c.us'
    assert ji.external_key_for(jid) == hashlib.sha256(jid.encode()).hexdigest()
    # Name fallback is the casefolded title (identical to sync_chats).
    assert ji.key_from_chat(None, '', 'Hammad') == ji.external_key_for('hammad')
    assert ji.key_from_chat(jid, 'ignored', 'Hammad') == ji.external_key_for(jid)


def test_number_from_jid():
    assert ji.number_from_jid('923001234567@c.us') == '923001234567'
    assert ji.number_from_jid('120363012345@g.us') == ''   # group -> no personal number
    assert ji.number_from_jid(None) == ''


class _M:
    def __init__(self, i, sid):
        self.id = i; self.source_message_id = sid


def test_plan_conversation():
    none = ji.plan_conversation(1, 'namekey', [_M(1, 'BAREHEX1234567890AB')])
    assert none['action'] == 'none'
    single = ji.plan_conversation(1, 'namekey',
                                  [_M(1, 'false_111@c.us_A'), _M(2, 'true_111@c.us_B')])
    assert single['action'] == 'rekey' and single['jid'] == '111@c.us'
    merged = ji.plan_conversation(1, 'namekey', [
        _M(1, 'false_111@c.us_A'), _M(2, 'false_111@c.us_B'), _M(3, 'false_111@c.us_C'),
        _M(4, 'false_222@c.us_D'), _M(5, 'false_222@c.us_E')])
    assert merged['action'] == 'split' and merged['keep_jid'] == '111@c.us'   # dominant (3 msgs)
    assert [mv['jid'] for mv in merged['moves']] == ['222@c.us']
    assert merged['moves'][0]['message_ids'] == [4, 5]


# --- migration on in-memory SQLite -----------------------------------------

def _session():
    eng = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(eng)
    return sessionmaker(bind=eng)()


def _seed_merged(db):
    emp = User(full_name='Emp', email='e@t.invalid', employee_code='001', whatsapp_number='1',
               role='employee', approved=True, active=True, password_hash='x')
    db.add(emp); db.flush()
    # One name-keyed conversation that actually holds TWO contacts named "Hammad".
    conv = Conversation(employee_id=emp.id, external_key=ji.external_key_for('hammad'), title='Hammad')
    db.add(conv); db.flush()
    rows = [
        ('f1', 'false_923111@c.us_A1'), ('f2', 'true_923111@c.us_A2'), ('f3', 'false_923111@c.us_A3'),
        ('f4', 'false_923222@c.us_B1'), ('f5', 'false_923222@c.us_B2'),
        ('f6', 'BARE0000000000000000'),  # no JID -> stays with the dominant contact
    ]
    for fp, sid in rows:
        db.add(Message(conversation_id=conv.id, fingerprint=fp, text='hi', from_me=sid.startswith('true_'),
                       sender='Hammad', media='', source_message_id=sid))
    db.flush()
    return emp, conv


def test_migration_splits_same_name_merge():
    db = _session()
    emp, conv = _seed_merged(db)
    conv_id = conv.id

    # Dry run reports the split but writes nothing.
    rep = ji.migrate_identity(db, dry_run=True)
    assert rep['split'] == 1 and rep['new_conversations'] == 1 and rep['messages_moved'] == 2
    after_dry = db.scalars(select(Conversation)).all()
    assert len(after_dry) == 1 and after_dry[0].external_key == ji.external_key_for('hammad')  # unchanged

    # Real run.
    rep = ji.migrate_identity(db, dry_run=False)
    assert rep['split'] == 1 and rep['new_conversations'] == 1 and rep['messages_moved'] == 2
    convs = {c.external_key: c for c in db.scalars(select(Conversation)).all()}
    assert ji.external_key_for('923111@c.us') in convs
    assert ji.external_key_for('923222@c.us') in convs
    assert ji.external_key_for('hammad') not in convs  # original re-keyed to dominant JID
    keep = convs[ji.external_key_for('923111@c.us')]
    split = convs[ji.external_key_for('923222@c.us')]
    assert keep.id == conv_id and keep.contact_number == '923111'
    assert split.contact_number == '923222' and split.title == 'Hammad'
    keep_msgs = db.scalars(select(Message).where(Message.conversation_id == keep.id)).all()
    split_msgs = db.scalars(select(Message).where(Message.conversation_id == split.id)).all()
    assert len(keep_msgs) == 4 and len(split_msgs) == 2  # 3 JID-A + 1 bare stay; 2 JID-B move
    assert {m.source_message_id for m in split_msgs} == {'false_923222@c.us_B1', 'false_923222@c.us_B2'}

    # Idempotent: a second run changes nothing.
    rep2 = ji.migrate_identity(db, dry_run=False)
    assert rep2['rekeyed'] == 0 and rep2['split'] == 0 and rep2['messages_moved'] == 0


def test_migration_rekeys_single_jid_and_skips_bare():
    db = _session()
    emp = User(full_name='Emp', email='e@t.invalid', employee_code='001', whatsapp_number='1',
               role='employee', approved=True, active=True, password_hash='x')
    db.add(emp); db.flush()
    single = Conversation(employee_id=emp.id, external_key=ji.external_key_for('ali'), title='Ali')
    bare = Conversation(employee_id=emp.id, external_key=ji.external_key_for('unknown'), title='Unknown')
    db.add_all([single, bare]); db.flush()
    db.add(Message(conversation_id=single.id, fingerprint='s1', source_message_id='false_999@c.us_X', media=''))
    db.add(Message(conversation_id=bare.id, fingerprint='b1', source_message_id='BARE1111111111111111', media=''))
    db.flush()
    rep = ji.migrate_identity(db, dry_run=False)
    assert rep['rekeyed'] == 1 and rep['skipped_no_jid'] == 1 and rep['split'] == 0
    db.refresh(single); db.refresh(bare)
    assert single.external_key == ji.external_key_for('999@c.us') and single.contact_number == '999'
    assert bare.external_key == ji.external_key_for('unknown')  # untouched (no JID to prove identity)


def test_migration_never_deletes_on_collision():
    # Two conversations resolve to the SAME JID (e.g. a duplicate of one contact).
    # The migration must SKIP the re-key, never merge-and-delete — no lost rows.
    db = _session()
    emp = User(full_name='Emp', email='e@t.invalid', employee_code='001', whatsapp_number='1',
               role='employee', approved=True, active=True, password_hash='x')
    db.add(emp); db.flush()
    a = Conversation(employee_id=emp.id, external_key=ji.external_key_for('999@c.us'), title='X')
    dupe = Conversation(employee_id=emp.id, external_key=ji.external_key_for('x-name'), title='X')
    db.add_all([a, dupe]); db.flush()
    db.add(Message(conversation_id=a.id, fingerprint='a1', source_message_id='false_999@c.us_A', media=''))
    db.add(Message(conversation_id=dupe.id, fingerprint='d1', source_message_id='false_999@c.us_B', media=''))
    db.flush()
    before_convs = len(db.scalars(select(Conversation)).all())
    before_msgs = len(db.scalars(select(Message)).all())
    rep = ji.migrate_identity(db, dry_run=False)
    assert rep['rekey_skipped_collision'] >= 1
    assert len(db.scalars(select(Conversation)).all()) == before_convs  # nothing deleted
    assert len(db.scalars(select(Message)).all()) == before_msgs        # no message lost


def test_migration_recovers_a_merged_away_contact():
    # The state an earlier destructive run could leave: ONE conversation already keyed
    # to contact A's JID that also holds contact B's messages (B's own row was merged
    # away). Re-running the fixed migration must split B back out, losing nothing.
    db = _session()
    emp = User(full_name='Emp', email='e@t.invalid', employee_code='001', whatsapp_number='1',
               role='employee', approved=True, active=True, password_hash='x')
    db.add(emp); db.flush()
    merged = Conversation(employee_id=emp.id, external_key=ji.external_key_for('923111@c.us'), title='Hammad')
    db.add(merged); db.flush()
    for fp, sid in [('a1', 'false_923111@c.us_A1'), ('a2', 'false_923111@c.us_A2'), ('a3', 'false_923111@c.us_A3'),
                    ('b1', 'false_923222@c.us_B1'), ('b2', 'false_923222@c.us_B2')]:
        db.add(Message(conversation_id=merged.id, fingerprint=fp, source_message_id=sid, media=''))
    db.flush()
    before_msgs = len(db.scalars(select(Message)).all())
    rep = ji.migrate_identity(db, dry_run=False)
    assert rep['split'] == 1 and rep['new_conversations'] == 1
    assert len(db.scalars(select(Message)).all()) == before_msgs  # recovered, not lost
    convs = {c.external_key: c for c in db.scalars(select(Conversation)).all()}
    assert set(convs) == {ji.external_key_for('923111@c.us'), ji.external_key_for('923222@c.us')}
    b = convs[ji.external_key_for('923222@c.us')]
    assert len(db.scalars(select(Message).where(Message.conversation_id == b.id)).all()) == 2
