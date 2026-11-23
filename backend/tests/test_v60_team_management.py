"""Team management: delete disabled/unapproved employees (with data cascade) and
guards, plus the main dashboard showing only approved counsellors. Standalone SQLite."""
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db import Base, get_db
from app.models import User, Conversation, Message, VoiceAsset, AuditJob, SyncLog, SecurityEvent
from app.main import app
from app.security import admin_only

NOW = datetime(2026, 11, 24, 9, 0, tzinfo=timezone.utc)


def _seed(db):
    admin = User(full_name='Admin', email='a@t.invalid', employee_code='ADM', whatsapp_number='000',
                 role='admin', approved=True, active=True, password_hash='x')
    # disabled employee WITH data -> deletable, data must cascade.
    gone = User(full_name='Zara Disabled', email='z@t.invalid', employee_code='050', whatsapp_number='050',
                role='employee', approved=True, active=False, password_hash='x')
    # pending (unapproved) employee -> deletable.
    pend = User(full_name='Pending Pat', email='p@t.invalid', employee_code='051', whatsapp_number='051',
                role='employee', approved=False, active=True, password_hash='x')
    # live approved+active employee -> NOT deletable.
    live = User(full_name='Active Ann', email='n@t.invalid', employee_code='052', whatsapp_number='052',
                role='employee', approved=True, active=True, password_hash='x')
    db.add_all([admin, gone, pend, live]); db.flush()
    c = Conversation(employee_id=gone.id, external_key='k', title='Cust', state='potential_lead',
                     first_seen_at=NOW, last_seen_at=NOW)
    db.add(c); db.flush()
    m = Message(conversation_id=c.id, fingerprint='f', text='hi', occurred_at=NOW, from_me=False, sender='Cust', media='voice')
    db.add(m); db.flush()
    db.add_all([
        VoiceAsset(message_id=m.id, status='available', audio_data=b'OggS....'),
        AuditJob(employee_id=gone.id, requested_by=gone.id),
        SyncLog(employee_id=gone.id),
        SecurityEvent(actor_id=gone.id, action='login'),
    ])
    db.commit()
    return admin.id, gone.id, pend.id, live.id, c.id, m.id


def _client(Factory, admin_id):
    def db_override():
        with Factory() as db: yield db
    def admin_override():
        with Factory() as db: return db.get(User, admin_id)
    app.dependency_overrides[get_db] = db_override
    app.dependency_overrides[admin_only] = admin_override
    return TestClient(app)


def test_delete_guards_and_cascade_and_cards():
    engine = create_engine('sqlite+pysqlite:///:memory:', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Factory = sessionmaker(bind=engine)
    with Factory() as db:
        admin_id, gone_id, pend_id, live_id, conv_id, msg_id = _seed(db)
    client = _client(Factory, admin_id)
    try:
        # --- Guards ---
        assert client.delete(f'/admin/employees/{live_id}').status_code == 409   # active+approved blocked
        assert client.delete(f'/admin/employees/{admin_id}').status_code == 403   # admin blocked
        assert client.delete('/admin/employees/99999').status_code == 404

        # --- Delete a disabled employee + cascade all their data ---
        ok = client.delete(f'/admin/employees/{gone_id}')
        assert ok.status_code == 200, ok.text
        with Factory() as db:
            assert db.get(User, gone_id) is None
            assert db.scalar(select(Conversation).where(Conversation.id == conv_id)) is None
            assert db.scalar(select(Message).where(Message.id == msg_id)) is None
            assert db.scalar(select(VoiceAsset).where(VoiceAsset.message_id == msg_id)) is None
            assert db.scalar(select(AuditJob).where(AuditJob.employee_id == gone_id)) is None
            assert db.scalar(select(SyncLog).where(SyncLog.employee_id == gone_id)) is None
            # The security event survives but its actor reference is detached.
            ev = db.scalar(select(SecurityEvent).where(SecurityEvent.action == 'login'))
            assert ev is not None and ev.actor_id is None

        # A pending (unapproved) employee is also deletable.
        assert client.delete(f'/admin/employees/{pend_id}').status_code == 200

        # --- Main dashboard counsellor cards show only approved employees ---
        cards = client.get('/admin/employee-cards').json()['employees']
        names = {c['name'] for c in cards}
        assert names == {'Active Ann'}          # the only approved one left
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(admin_only, None)
        engine.dispose()
