"""End-to-end: build_summary emits the deterministic management-analytics keys and
generate_pdf renders them without error. Isolated SQLite; no live data/AI."""
import os
os.environ.setdefault("DATABASE_URL","postgresql+psycopg://dummy:dummy@127.0.0.1:5432/csr_isolated_test")
os.environ.setdefault("APP_ENV","development")
os.environ.setdefault("JWT_SECRET","local-isolated-test-only-key-value-abcdefghijklmnopqrstuvwxyz123456789")
import pytest
pytest.importorskip("psycopg", reason="requires project PostgreSQL driver import path")
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from app.db import Base
from app.models import User, Conversation, Message
from app.analysis import build_summary
from app.reporting import generate_pdf

NOW = datetime(2026, 11, 17, 12, 0, tzinfo=timezone.utc)


def _seed(d):
    d.add(User(id=1, full_name='Emp', email='e@test.invalid', employee_code='1',
               whatsapp_number='+10', password_hash='x', role='employee', active=True, approved=True))
    # New lead this window: first message is an in-window inbound, counselor replies.
    c1 = Conversation(id=1, employee_id=1, external_key='k1', title='New Lead',
                      state='potential_lead', first_seen_at=NOW - timedelta(hours=3), last_seen_at=NOW)
    # Existing follow-up: first message is 20 days old; counselor reaches out in window.
    c2 = Conversation(id=2, employee_id=1, external_key='k2', title='Follow Up',
                      state='potential_lead', first_seen_at=NOW - timedelta(days=20), last_seen_at=NOW)
    d.add_all([c1, c2]); d.flush()
    msgs = [
        (1, False, 'I want admission in Italy and a scholarship', NOW - timedelta(hours=2), ''),
        (1, True, 'Sure, here are the details', NOW - timedelta(hours=2) + timedelta(minutes=6), ''),
        (2, False, 'old question', NOW - timedelta(days=20), ''),
        (2, True, 'following up with you', NOW - timedelta(hours=1), ''),
        (2, False, 'missed call', NOW - timedelta(minutes=50), 'call'),
    ]
    for i, (cid, fm, txt, dt, media) in enumerate(msgs):
        d.add(Message(conversation_id=cid, fingerprint=f'fp{i}', from_me=fm, text=txt, occurred_at=dt, media=media))
    d.commit()


def test_build_summary_and_pdf_management_keys():
    eng = create_engine('sqlite+pysqlite:///:memory:', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(eng)
    try:
        with Session(eng) as d:
            _seed(d)
            s = build_summary(d, 1, begin=NOW - timedelta(hours=25), end=NOW, period_label='Last 25 hours')
            # New lead detected and responded; follow-up detected separately.
            assert s['new_leads'] == 1
            assert s['new_lead_responded'] == 1
            assert s['follow_up_conversations'] == 1
            assert s['worked_on_chats'] == 2
            # First response was 6 minutes = 360s.
            assert s['avg_new_lead_first_response_seconds'] == 360
            # Country pipeline picked up Italy as a potential-lead destination.
            assert s['country_leads'].get('Italy') == 1
            # Reply state present for both conversations.
            assert sum(s['reply_states'].values()) == 2
            # A genuine inbound call event on the follow-up conversation.
            assert s['calls_inbound'] == 1 and s['follow_up_calls'] == 1
            # Deterministic lead tiers populated (keys present).
            assert set(s['lead_tiers']) == {'close_to_conversion', 'very_hot', 'hot', 'average', 'cold'}
            # PDF renders with the new block.
            pdf = generate_pdf('Emp', s)
            assert isinstance(pdf, (bytes, bytearray)) and pdf[:4] == b'%PDF'
    finally:
        eng.dispose()
