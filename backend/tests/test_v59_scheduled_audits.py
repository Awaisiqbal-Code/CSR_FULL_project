"""Daily auto-audit scheduling: eligibility (non-group chats), A-Z order, 20-min
staggering, idempotency, and the worker's scheduled_for time-gating. Standalone SQLite."""
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine, select, or_
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db import Base
from app.models import User, Conversation, Message, AuditJob
from app import audit_schedule as sched

# 18:30 PKT on 2026-11-24  ->  13:30 UTC (PKT = UTC+5). Run start = 18:00 PKT = 13:00 UTC.
NOW = datetime(2026, 11, 24, 13, 30, tzinfo=timezone.utc)
RUN_START = datetime(2026, 11, 24, 13, 0, tzinfo=timezone.utc)


def _emp(db, name, code):
    u = User(full_name=name, email=f'{code}@t.invalid', employee_code=code,
             whatsapp_number=code, role='employee', approved=True, active=True, password_hash='x')
    db.add(u); db.flush(); return u


def _chat(db, emp, key, title):
    c = Conversation(employee_id=emp.id, external_key=key, title=title, state='potential_lead',
                     first_seen_at=NOW, last_seen_at=NOW)
    db.add(c); db.flush(); return c


def _seed(db):
    # alice & Charlie: a normal 1:1 chat with a message -> eligible.
    alice = _emp(db, 'alice', '010'); charlie = _emp(db, 'Charlie', '011')
    bob = _emp(db, 'Bob', '012'); dave = _emp(db, 'Dave', '013')
    for e in (alice, charlie):
        c = _chat(db, e, f'k{e.id}', 'Customer')
        db.add(Message(conversation_id=c.id, fingerprint=f'f{e.id}', text='hi', occurred_at=NOW,
                       from_me=False, sender='Customer', media=''))
    # Bob: ONLY a group chat (two distinct inbound senders) -> excluded.
    g = _chat(db, bob, 'kg', 'Team Group')
    db.add_all([Message(conversation_id=g.id, fingerprint='g1', text='a', occurred_at=NOW, from_me=False, sender='Alpha', media=''),
                Message(conversation_id=g.id, fingerprint='g2', text='b', occurred_at=NOW, from_me=False, sender='Beta', media='')])
    # Dave: no chats at all -> excluded.
    db.commit()
    return alice.id, charlie.id, bob.id, dave.id


def _engine():
    eng = create_engine('sqlite+pysqlite:///:memory:', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(eng)
    return eng


def test_eligibility_and_order():
    eng = _engine(); S = sessionmaker(bind=eng)
    with S() as db:
        alice_id, charlie_id, bob_id, dave_id = _seed(db)
        elig = sched.eligible_employees(db)
        ids = [u.id for u in elig]
        assert ids == [alice_id, charlie_id]          # A->Z (case-insensitive), groups/no-chat excluded
        assert bob_id not in ids and dave_id not in ids
    eng.dispose()


def test_daily_batch_staggered_and_idempotent():
    eng = _engine(); S = sessionmaker(bind=eng)
    with S() as db:
        alice_id, charlie_id, *_ = _seed(db)
        sched._last_handled_local_date = None
        # Before the run hour -> nothing queued.
        assert sched.ensure_daily_batch(db, now_utc=RUN_START - timedelta(minutes=1)) == 0
        sched._last_handled_local_date = None
        # At/after the run hour -> one job per eligible employee.
        assert sched.ensure_daily_batch(db, now_utc=NOW) == 2
        jobs = db.scalars(select(AuditJob).order_by(AuditJob.scheduled_for)).all()
        assert [j.employee_id for j in jobs] == [alice_id, charlie_id]      # A->Z
        assert all(j.auto_generated and j.hours == 25 for j in jobs)
        # SQLite returns naive datetimes; compare tz-stripped (Postgres keeps tz).
        def _n(dt): return dt.replace(tzinfo=None)
        assert _n(jobs[0].scheduled_for) == _n(RUN_START)                   # 18:00 PKT
        assert _n(jobs[1].scheduled_for) == _n(RUN_START + timedelta(minutes=20))  # +20 min
        assert _n(jobs[0].range_end) == _n(jobs[0].scheduled_for)           # window ends at the slot
        # Idempotent: a second run (even with the in-memory guard cleared) adds nothing.
        sched._last_handled_local_date = None
        assert sched.ensure_daily_batch(db, now_utc=NOW + timedelta(minutes=5)) == 0
        assert db.scalar(select(AuditJob.id).where(AuditJob.auto_generated.is_(True)).order_by(AuditJob.id.desc())) is not None
        assert len(db.scalars(select(AuditJob)).all()) == 2
    eng.dispose()


def test_worker_gating_respects_scheduled_for():
    """Mirror the worker's pending-selection: a future scheduled job is skipped;
    a due one and a manual (NULL) one are eligible, earliest slot first."""
    eng = _engine(); S = sessionmaker(bind=eng)
    with S() as db:
        a = _emp(db, 'A', '001')
        future = AuditJob(employee_id=a.id, requested_by=a.id, scheduled_for=NOW + timedelta(hours=1), auto_generated=True)
        due = AuditJob(employee_id=a.id, requested_by=a.id, scheduled_for=NOW - timedelta(minutes=5), auto_generated=True)
        manual = AuditJob(employee_id=a.id, requested_by=a.id, scheduled_for=None)
        db.add_all([future, due, manual]); db.commit()

        def pick(now):
            stmt = (select(AuditJob).where(AuditJob.status == 'pending',
                    or_(AuditJob.scheduled_for.is_(None), AuditJob.scheduled_for <= now))
                    .order_by(AuditJob.scheduled_for.asc().nullsfirst(), AuditJob.id).limit(1))
            return db.scalars(stmt).first()

        first = pick(NOW)
        assert first.scheduled_for is None                 # manual (NULL) sorts first
        # Remove manual + due; only the future job remains -> not yet eligible.
        db.delete(manual); db.delete(due); db.commit()
        assert pick(NOW) is None                            # future job is gated out
        assert pick(NOW + timedelta(hours=2)) is not None   # eligible once its time arrives
    eng.dispose()
