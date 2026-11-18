"""Audit reporting window must filter at the MESSAGE timestamp level, exclude
undated messages from the period, and never silently fall back to all-time
(DB requested-changes spec, 2026-11-17). Isolated SQLite; no live data."""
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

NOW = datetime(2026, 11, 17, 12, 0, tzinfo=timezone.utc)


def _seed(d):
    d.add(User(id=1, full_name='Emp', email='e@test.invalid', employee_code='1',
               whatsapp_number='+10', password_hash='x', role='employee', active=True, approved=True))
    # One conversation, recently active, but with BOTH old and in-window messages.
    c = Conversation(id=1, employee_id=1, external_key='k1', title='Customer',
                     state='potential_lead',  # stored full-history category (spec 5.2)
                     first_seen_at=NOW - timedelta(days=40), last_seen_at=NOW - timedelta(hours=1))
    d.add(c)
    d.flush()
    specs = [
        (False, 'old question', NOW - timedelta(days=30)),
        (False, 'recent apply to Germany', NOW - timedelta(hours=2)),
        (True, 'recent reply', NOW - timedelta(hours=1)),
        (False, 'undated note', None),
    ]
    for i, (fm, txt, dt) in enumerate(specs):
        d.add(Message(conversation_id=1, fingerprint=f'fp{i}', from_me=fm, text=txt, occurred_at=dt))
    d.commit()


def test_audit_window_is_message_level():
    eng = create_engine('sqlite+pysqlite:///:memory:', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(eng)
    try:
        with Session(eng) as d:
            _seed(d)
            begin = NOW - timedelta(hours=25)
            s = build_summary(d, 1, begin=begin, end=NOW, period_label='Last 25 hours')
            # Only the two in-window messages are analyzed; the 30-day-old one is excluded
            # even though the conversation is recently active.
            assert s['analyzed_messages'] == 2
            assert s['eligible_chats'] == 1
            assert s['undated_excluded'] == 1          # flagged, not invented, not in period
            assert s['period_label'] == 'Last 25 hours'
            # Category comes from the stored full-history state (spec 5.2), retained
            # even though only in-window messages are analyzed for metrics.
            assert s['potential_leads'] == 1
    finally:
        eng.dispose()


def test_empty_window_is_no_data_not_all_time():
    eng = create_engine('sqlite+pysqlite:///:memory:', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(eng)
    try:
        with Session(eng) as d:
            _seed(d)
            # A window far in the future: zero eligible messages.
            s = build_summary(d, 1, begin=NOW + timedelta(days=1), end=NOW + timedelta(days=2),
                              period_label='Custom range')
            assert s['total_chats'] == 0
            assert s['analyzed_messages'] == 0
            assert any('no-data' in n.lower() or 'no eligible' in n.lower() for n in s['quality_notes'])
    finally:
        eng.dispose()
