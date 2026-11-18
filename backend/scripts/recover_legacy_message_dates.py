"""Non-destructive date recovery for existing PostgreSQL records.

DRY RUN by default. First derives DD/MM vs MM/DD from existing exact dated
messages *of the same employee*, then previews legacy fixes. Does not use
received_at as a substitute for the original WhatsApp event timestamp.

From backend folder:
    python -m scripts.recover_legacy_message_dates
    python -m scripts.recover_legacy_message_dates --employee-id 2
    python -m scripts.recover_legacy_message_dates --apply --employee-id 2
"""
from __future__ import annotations
import argparse
from collections import Counter
from sqlalchemy import select
from app.db import SessionLocal
from app.models import Conversation, Message
from app.legacy_dates import infer_date_order, recover_message_date, recover_with_company_evidence


def _original_row(m):
    return (m.timestamp, m.occurred_at, m.time_quality)


def summarize_recovery(conversations, *, apply=False, date_order=None, company_order=None):
    """Pure logic over already-loaded ORM-style objects; useful for test preview."""
    stats = Counter()
    samples = []
    all_messages = [m for _, messages in conversations for m in messages]
    employee_order = infer_date_order(
        [m.timestamp for m in all_messages],
        [_original_row(m) for m in all_messages if m.occurred_at is not None],
    )
    if date_order in ('DMY', 'MDY'):
        employee_order = date_order
        stats['manual_order_override'] += 1
    for _, messages in conversations:
        local_order = infer_date_order(
            [m.timestamp for m in messages],
            [_original_row(m) for m in messages if m.occurred_at is not None],
        )
        # If a chat has credible contradictory order, do not silently use the
        # employee fallback. Run-level reviewer will see conflicting format.
        if local_order and employee_order and local_order != employee_order and not date_order:
            stats['conflicting_chat_format'] += 1
            order = None
        else:
            order = employee_order if date_order else (local_order or employee_order)
        for message in messages:
            if message.occurred_at is not None:
                continue
            stats['missing_before'] += 1
            if not (message.timestamp or '').strip():
                stats['empty_source_timestamp'] += 1
                if len(samples) < 8:
                    samples.append((message.id, '[EMPTY]'))
                continue
            dt = recover_message_date(message.timestamp, message.received_at, order)
            if dt is None and order is None and not local_order and not employee_order and company_order:
                dt = recover_with_company_evidence(message.timestamp, message.received_at, company_order)
                if dt is not None:
                    stats['company_evidence_recovered'] += 1
            if dt is None:
                stats['unresolved_nonempty'] += 1
                if len(samples) < 8:
                    samples.append((message.id, repr((message.timestamp or '')[:90])))
            else:
                stats['recoverable'] += 1
                if apply:
                    message.occurred_at = dt
                    message.time_quality = 'recovered'
    stats['unresolved'] = stats['empty_source_timestamp'] + stats['unresolved_nonempty']
    return stats, samples, employee_order


def run(apply: bool = False, employee_id: int | None = None, date_order: str | None = None):
    with SessionLocal() as db:
        stmt = select(Conversation).order_by(Conversation.id)
        if employee_id is not None:
            stmt = stmt.where(Conversation.employee_id == employee_id)
        groups = {}
        for c in db.scalars(stmt).all():
            groups.setdefault(c.employee_id, []).append((
                c, db.scalars(select(Message).where(Message.conversation_id == c.id)
                              .order_by(Message.id)).all()
            ))
        # Company-wide ORIGINAL raw timestamps can carry hard DMY/MDY signals
        # (e.g. 31/10), even where their occurred_at has since been recovered.
        # Infer from raw date syntax plus independently exact source/event pairs.
        # If evidence conflicts, leave company_order inconclusive. Per-message
        # fallback STILL requires the other calendar interpretation to be
        # outside that message's eight-day ingestion window.
        from app.models import User
        company_rows = db.execute(
            select(Message.timestamp, Message.occurred_at, Message.time_quality)
            .join(Conversation, Conversation.id == Message.conversation_id)
            .join(User, User.id == Conversation.employee_id)
            .where(User.role == 'employee')
            .order_by(Message.id.desc()).limit(20000)
        ).all()
        company_order = infer_date_order([row[0] for row in company_rows], company_rows)
        print('company_original_date_order_evidence:', company_order or 'INCONCLUSIVE')
        for employee, conversations in sorted(groups.items()):
            stats, examples, detected_order = summarize_recovery(
                conversations, apply=apply, date_order=date_order, company_order=company_order
            )
            label = 'APPLIED' if apply else 'DRY RUN (no rows changed)'
            print(f'\n{label}: employee internal DB id = {employee}')
            print('employee_date_order_evidence:', detected_order or 'INCONCLUSIVE')
            print('company_fallback_recovered:', stats['company_evidence_recovered'])
            if date_order:
                print('CAUTION: explicit date-order override was used; verify WhatsApp locale first.')
            for k in ('missing_before', 'recoverable', 'unresolved',
                      'empty_source_timestamp', 'unresolved_nonempty',
                      'conflicting_chat_format'):
                print(f'{k}: {stats[k]}')
            if examples:
                print('Unresolved examples (NOT modified):', examples)
        if apply:
            db.commit()
        else:
            db.rollback()
            print('\nNo rows modified. Take a verified PostgreSQL backup before --apply.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true', help='Apply previewed recoverable dates (NO deletes)')
    parser.add_argument('--employee-id', type=int, help='Filter by users.id (NOT public 001 code)')
    parser.add_argument('--date-order', choices=['DMY', 'MDY'],
                        help='EXPLICIT admin-verified source date order, only if automatic evidence is inconclusive')
    args = parser.parse_args()
    run(args.apply, args.employee_id, args.date_order)
