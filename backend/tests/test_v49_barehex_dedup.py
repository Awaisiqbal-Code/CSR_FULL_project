"""v4.9: current WhatsApp bare-hex message ids must de-duplicate by identity and
update direction in place (no duplicate rows, no direction-flip duplicates).
Isolated SQLite; never touches the restored PostgreSQL database."""
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
from app.models import Message, User


def test_barehex_id_dedup_and_direction_update():
    eng=create_engine('sqlite+pysqlite:///:memory:',connect_args={'check_same_thread':False},poolclass=StaticPool)
    Base.metadata.create_all(eng)
    try:
      with Session(eng) as d:
        d.add(User(full_name='Counselor',email='c@test.invalid',employee_code='902',
            whatsapp_number='+923009999999',password_hash='x',role='employee',active=True,approved=True))
        d.commit()
        user=d.scalar(select(User))
        app.dependency_overrides[current_user]=lambda:user
        app.dependency_overrides[get_db]=lambda:d
        try:
            c=TestClient(app)
            # Current WhatsApp ids are bare uppercase hex (no true_/false_ prefix).
            first=[
                {'id':'ACE35E5AFAC83EB2A263D388FF64AC1A','source_message_id':'ACE35E5AFAC83EB2A263D388FF64AC1A','sender':'Contact','fromMe':False,'text':'Hello there'},
                {'id':'3EB066FF054A42E1D2E5EB','source_message_id':'3EB066FF054A42E1D2E5EB','sender':'You','fromMe':True,'text':'Reply back'},
            ]
            payload={'chats':[{'title':'Contact','id':'chat_x','messages':first}],'unread_count':0}
            r=c.post('/sync/chats',json=payload); assert r.status_code==200,r.text
            assert r.json()['new_messages']==2
            assert d.scalar(select(func.count()).select_from(Message))==2

            # Re-sync the SAME ids, but the first message's direction was corrected
            # (was wrongly incoming, now outgoing). Must UPDATE in place, not insert.
            again=[
                {'id':'ACE35E5AFAC83EB2A263D388FF64AC1A','source_message_id':'ACE35E5AFAC83EB2A263D388FF64AC1A','sender':'You','fromMe':True,'text':'Hello there'},
                {'id':'3EB066FF054A42E1D2E5EB','source_message_id':'3EB066FF054A42E1D2E5EB','sender':'You','fromMe':True,'text':'Reply back'},
            ]
            payload2={'chats':[{'title':'Contact','id':'chat_x','messages':again}],'unread_count':0}
            r2=c.post('/sync/chats',json=payload2); assert r2.status_code==200
            assert r2.json()['new_messages']==0, 'bare-hex ids must not create duplicates on re-sync'
            assert d.scalar(select(func.count()).select_from(Message))==2, 'no duplicate rows'
            corrected=d.scalar(select(Message).where(Message.source_message_id=='ACE35E5AFAC83EB2A263D388FF64AC1A'))
            assert corrected.from_me is True, 'direction correction must update the existing row in place'
            assert corrected.sender=='You'
        finally:
            app.dependency_overrides.clear()
    finally:
        eng.dispose()
