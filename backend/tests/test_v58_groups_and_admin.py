"""Chats vs Groups split + audit excludes groups + admin sets employee password.
Standalone SQLite; never touches real PostgreSQL or live chats."""
import pytest
pytest.importorskip('psycopg', reason='PostgreSQL driver is not present in this runtime')
from app.config import DB_URL, JWT_SECRET
if not DB_URL.startswith('postgresql+psycopg://') or len(JWT_SECRET) < 40:
    pytest.skip('Local test requires configured backend credentials (no real DB used)', allow_module_level=True)
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db import Base, get_db
from app.models import User, Conversation, Message
from app.main import app
from app.security import admin_only, hash_password, check_password
from app.analysis import build_summary

NOW = datetime(2026, 11, 20, 9, 0, tzinfo=timezone.utc)


def _seed(db):
    admin = User(full_name='Super Admin', email='admin@test.invalid', employee_code='ADMIN',
                 whatsapp_number='000001', role='admin', approved=True, active=True, password_hash='x')
    emp = User(full_name='Talha', email='t@test.invalid', employee_code='001', whatsapp_number='000002',
               role='employee', approved=True, active=True, password_hash=hash_password('oldpass123'))
    db.add_all([admin, emp]); db.flush()
    # 1:1 chat — a single inbound sender.
    one = Conversation(employee_id=emp.id, external_key='k1', title='Customer A',
                       state='potential_lead', first_seen_at=NOW, last_seen_at=NOW)
    # Group — two distinct inbound senders.
    grp = Conversation(employee_id=emp.id, external_key='k2', title='Team Group',
                       state='potential_lead', first_seen_at=NOW, last_seen_at=NOW)
    # Group — one sender but a @g.us group JID in the source id.
    jid = Conversation(employee_id=emp.id, external_key='k3', title='JID Group',
                       state='potential_lead', first_seen_at=NOW, last_seen_at=NOW)
    db.add_all([one, grp, jid]); db.flush()
    db.add_all([
        Message(conversation_id=one.id, fingerprint='a1', text='I want admission in Italy scholarship',
                occurred_at=NOW, from_me=False, sender='Customer A', media=''),
        Message(conversation_id=one.id, fingerprint='a2', text='Sure', occurred_at=NOW + timedelta(minutes=5),
                from_me=True, sender='You', media=''),
        Message(conversation_id=grp.id, fingerprint='b1', text='hi all', occurred_at=NOW, from_me=False, sender='Alice', media=''),
        Message(conversation_id=grp.id, fingerprint='b2', text='hello', occurred_at=NOW, from_me=False, sender='Bob', media=''),
        Message(conversation_id=jid.id, fingerprint='c1', text='group note', occurred_at=NOW, from_me=False,
                sender='Solo', media='', source_message_id='false_9876@g.us_DEADBEEF'),
    ]); db.commit()
    return admin.id, emp.id


def _overrides(Factory, admin_id):
    def db_override():
        with Factory() as db: yield db
    def admin_override():
        with Factory() as db: return db.get(User, admin_id)
    app.dependency_overrides[get_db] = db_override
    app.dependency_overrides[admin_only] = admin_override


def test_chats_groups_filter_and_audit_and_password():
    engine = create_engine('sqlite+pysqlite:///:memory:', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Factory = sessionmaker(bind=engine)
    with Factory() as db:
        admin_id, emp_id = _seed(db)
    _overrides(Factory, admin_id)
    try:
        client = TestClient(app)
        # --- Chats vs Groups split on /conversations ---
        allc = client.get('/conversations', params={'employee_id': emp_id}).json()
        assert {c['title'] for c in allc['conversations']} == {'Customer A', 'Team Group', 'JID Group'}
        chats = client.get('/conversations', params={'employee_id': emp_id, 'kind': 'chats'}).json()
        assert {c['title'] for c in chats['conversations']} == {'Customer A'}
        groups = client.get('/conversations', params={'employee_id': emp_id, 'kind': 'groups'}).json()
        assert {c['title'] for c in groups['conversations']} == {'Team Group', 'JID Group'}
        assert client.get('/conversations', params={'employee_id': emp_id, 'kind': 'bogus'}).status_code == 422

        # --- Audit excludes groups (chat-only cohort) ---
        with Factory() as db:
            s = build_summary(db, emp_id, begin=NOW - timedelta(hours=1), end=NOW + timedelta(hours=1),
                              period_label='test')
        assert s['total_chats'] == 1
        assert {r['title'] for r in s['conversations']} == {'Customer A'}

        # --- Admin sets an employee's password ---
        bad = client.post(f'/admin/employees/{emp_id}/password', json={'password': 'short'})
        assert bad.status_code == 422  # min length enforced
        admin_target = client.post(f'/admin/employees/{admin_id}/password', json={'password': 'longenough1'})
        assert admin_target.status_code == 403  # cannot change an admin here
        assert client.post('/admin/employees/99999/password', json={'password': 'longenough1'}).status_code == 404
        ok = client.post(f'/admin/employees/{emp_id}/password', json={'password': 'BrandNewPass9'})
        assert ok.status_code == 200, ok.text
        with Factory() as db:
            u = db.get(User, emp_id)
            assert check_password('BrandNewPass9', u.password_hash)
            assert not check_password('oldpass123', u.password_hash)
            assert u.token_version >= 1  # old sessions invalidated
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(admin_only, None)
        engine.dispose()
