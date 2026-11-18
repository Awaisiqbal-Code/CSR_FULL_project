"""v4.5: isolated SQLite API test. Never touches restored PostgreSQL."""
import os
os.environ.setdefault("DATABASE_URL","postgresql+psycopg://dummy:dummy@127.0.0.1:5432/csr_isolated_test")
os.environ.setdefault("APP_ENV","development")
os.environ.setdefault("JWT_SECRET","local-isolated-test-only-key-value-abcdefghijklmnopqrstuvwxyz123456789")
import pytest
pytest.importorskip("psycopg", reason="Isolated API integration requires project PostgreSQL driver")
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from app.main import app, get_db, current_user
from app.db import Base
from app.models import Message, User, VoiceAsset


def test_wa_identity_dedup_and_sender_reconciliation():
    eng=create_engine('sqlite+pysqlite:///:memory:',connect_args={'check_same_thread':False},poolclass=StaticPool)
    Base.metadata.create_all(eng)
    try:
      with Session(eng) as d:
        d.add(User(full_name='Counselor Test',email='counselor@test.invalid',employee_code='901',
            whatsapp_number='+923001111111',password_hash='test',role='employee',active=True,approved=True))
        d.commit()
        user=d.scalar(select(User))
        app.dependency_overrides[current_user]=lambda:user
        app.dependency_overrides[get_db]=lambda:d
        try:
            c=TestClient(app)
            original=[
                {'id':'nested-a','source_message_id':'true_923001111111@c.us_LONG123','sender':'You','fromMe':False,'text':'I sent this'},
                {'id':'nested-b','source_message_id':'true_923001111111@c.us_LONG123','sender':'You','fromMe':False,'text':'I sent this'},
                {'id':'nested-c','source_message_id':'false_923001111111@c.us_LONG124','sender':'Contact','fromMe':True,'text':'They sent this'},
                {'id':'voice-a','source_message_id':'false_923001111111@c.us_LONG125','sender':'Contact','fromMe':False,'media':'voice','mediaDuration':'0:06'},
                {'id':'voice-b','source_message_id':'false_923001111111@c.us_LONG125','sender':'Contact','fromMe':False,'media':'voice','mediaDuration':'0:06'},
                {'id':'voice-c','source_message_id':'false_923001111111@c.us_LONG126','sender':'Contact','fromMe':False,'media':'voice','mediaDuration':'0:06'},
            ]
            payload={'chats':[{'title':'Contact','id':'test_contact','messages':original}], 'unread_count':0}
            r=c.post('/sync/chats',json=payload)
            assert r.status_code==200,r.text
            assert r.json()['new_messages']==4,r.json()
            rows=d.scalars(select(Message).order_by(Message.id)).all()
            assert len(rows)==4
            assert rows[0].from_me is True
            assert rows[1].from_me is False
            assert len([m for m in rows if m.media=='voice'])==2
            assert d.scalar(select(func.count()).select_from(VoiceAsset))==2
            again=c.post('/sync/chats',json=payload)
            assert again.status_code==200
            assert again.json()['new_messages']==0
            assert d.scalar(select(func.count()).select_from(Message))==4
        finally:
            app.dependency_overrides.clear()
    finally:
        # Dispose the engine only after the Session has closed; disposing the
        # StaticPool first closes the single in-memory connection and makes the
        # session's own close/rollback raise "Cannot operate on a closed database".
        eng.dispose()
