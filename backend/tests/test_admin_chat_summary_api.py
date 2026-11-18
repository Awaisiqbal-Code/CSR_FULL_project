"""Standalone SQLite verification of the Admin chat overview API.

Never touches configured PostgreSQL or the user's real chats.
"""
import pytest
pytest.importorskip('psycopg', reason='PostgreSQL driver is not present in this runtime')
from app.config import DB_URL, JWT_SECRET
if not DB_URL.startswith('postgresql+psycopg://') or len(JWT_SECRET) < 40:
    pytest.skip('Local test requires configured backend credentials (no real DB used)', allow_module_level=True)
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db import Base, get_db
from app.models import User, Conversation, Message, SyncLog
from app.main import app
from app.security import admin_only


def test_summary_scoped_and_no_guessing():
    engine=create_engine('sqlite+pysqlite:///:memory:',connect_args={'check_same_thread':False},poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Factory=sessionmaker(bind=engine)
    now=datetime(2026,11,13,9,0,tzinfo=timezone.utc)
    with Factory() as db:
        admin=User(full_name='Super Admin',email='admin@test.invalid',employee_code='ADMIN',whatsapp_number='000001',role='admin',approved=True,active=True,password_hash='unused')
        u=User(full_name='Abdullah',email='a@test.invalid',employee_code='001',whatsapp_number='000002',role='employee',approved=True,active=True,password_hash='unused')
        v=User(full_name='Hammad',email='b@test.invalid',employee_code='002',whatsapp_number='000003',role='employee',approved=True,active=True,password_hash='unused')
        db.add_all([admin,u,v]);db.flush()
        c=Conversation(employee_id=u.id,external_key='conv-1',title='Customer A',state='potential_lead',last_seen_at=now,first_seen_at=now)
        c2=Conversation(employee_id=v.id,external_key='conv-2',title='Customer B',state='unclassified',last_seen_at=now,first_seen_at=now)
        db.add_all([c,c2]);db.flush()
        db.add_all([
            Message(conversation_id=c.id,fingerprint='f1',text='Hello',occurred_at=now,from_me=False,media=''),
            Message(conversation_id=c.id,fingerprint='f2',text='Hello back',occurred_at=now+timedelta(minutes=4),from_me=True,media=''),
            Message(conversation_id=c.id,fingerprint='f3',text='',occurred_at=None,from_me=False,media='call'),
            Message(conversation_id=c2.id,fingerprint='f4',text='Hi',occurred_at=now,from_me=False,media=''),
            SyncLog(employee_id=u.id,unread_excluded=2), SyncLog(employee_id=v.id,unread_excluded=3),
        ]);db.commit();admin_id=admin.id;u_id=u.id
    def db_override():
        with Factory() as db:yield db
    def admin_override():
        with Factory() as db:return db.get(User,admin_id)
    app.dependency_overrides[get_db]=db_override
    app.dependency_overrides[admin_only]=admin_override
    try:
        client=TestClient(app)  # No app-lifespan; does not create real DB tables.
        company=client.get('/admin/chats/summary')
        assert company.status_code==200,company.text
        data=company.json()
        assert data['total_conversations']==2
        assert data['messages']==3 and data['call_events']==1
        assert data['unread_excluded_latest']==5
        employee=client.get('/admin/chats/summary',params={'employee_id':u_id}).json()
        assert employee['total_conversations']==1
        assert employee['messages']==2 and employee['call_events']==1
        assert employee['avg_response_seconds']==240
        assert employee['responded_chats']==1
        assert employee['unread_excluded_latest']==2
        assert client.get('/admin/chats/summary',params={'employee_id':99999}).status_code==404
        filtered=client.get('/admin/chats/summary',params={'employee_id':u_id,'start':'2026-11-13','end':'2026-11-13'})
        assert filtered.status_code==200,filtered.text
        assert filtered.json()['messages']==2
        assert filtered.json()['call_events']==0
        assert client.get('/admin/chats/summary',params={'start':'2026-11-13'}).status_code==422
    finally:
        app.dependency_overrides.pop(get_db,None)
        app.dependency_overrides.pop(admin_only,None)
        engine.dispose()
