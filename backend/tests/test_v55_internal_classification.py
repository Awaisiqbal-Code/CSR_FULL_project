"""Internal-staff / query-group conversations must not be classified as leads,
even when the collector stored them as potential_lead. Title-based deterministic
override; see analysis.is_internal_conversation."""
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
from app.analysis import build_summary, is_internal_conversation

NOW = datetime(2026, 11, 18, 12, 0, tzinfo=timezone.utc)


def test_internal_titles_detected():
    for t in ['Attendance scholarshiphive intern', 'CSR Auditing',
              'Scholarshiphive all Office Counselors', 'Student issues Scholarshiphive Edutancy',
              'FEMALE-Attendance-intern', 'France Queries', 'Queries Italy',
              'LHR-EVE ScholarshipHive Edutancy', 'Hassan Khalid Intern']:
        assert is_internal_conversation(t) is True, t


def test_real_customer_titles_not_flagged_internal():
    for t in ['Noor Ul Ain', 'Zubaim', 'Javed & Sons', 'MIAN Ahmad',
              'International House', '+92 333 9364477']:
        # "International" must NOT trigger the whole-word 'intern' marker.
        assert is_internal_conversation(t) is False, t


def _seed(d):
    d.add(User(id=1, full_name='Emp', email='e@test.invalid', employee_code='1',
               whatsapp_number='+10', password_hash='x', role='employee', active=True, approved=True))
    # A genuine lead and an internal group BOTH stored as potential_lead by the collector.
    lead = Conversation(id=1, employee_id=1, external_key='k1', title='Noor Ul Ain',
                        state='potential_lead', first_seen_at=NOW - timedelta(hours=3), last_seen_at=NOW)
    grp = Conversation(id=2, employee_id=1, external_key='k2', title='Queries Italy',
                       state='potential_lead', first_seen_at=NOW - timedelta(hours=3), last_seen_at=NOW)
    d.add_all([lead, grp]); d.flush()
    msgs = [
        (1, False, 'I want admission in Italy and a scholarship, my cgpa is 3.4', NOW - timedelta(hours=2), ''),
        (1, True, 'Sure, here are the details', NOW - timedelta(hours=2) + timedelta(minutes=5), ''),
        (2, False, 'Routing Italy queries here team', NOW - timedelta(hours=2), ''),
        (2, True, 'noted', NOW - timedelta(hours=2) + timedelta(minutes=5), ''),
    ]
    for i, (cid, fm, txt, dt, media) in enumerate(msgs):
        d.add(Message(conversation_id=cid, fingerprint=f'fp{i}', from_me=fm, text=txt, occurred_at=dt, media=media))
    d.commit()


def test_internal_group_reclassified_and_excluded_from_tiers():
    eng = create_engine('sqlite+pysqlite:///:memory:', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(eng)
    try:
        with Session(eng) as d:
            _seed(d)
            s = build_summary(d, 1, begin=NOW - timedelta(hours=25), end=NOW, period_label='Last 25 hours')
            rows = {r['title']: r for r in s['conversations']}
            # The internal group is reclassified away from potential_lead...
            assert rows['Queries Italy']['classification'] == 'internal_staff'
            # ...and therefore carries no lead tier.
            assert rows['Queries Italy']['lead_tier'] is None
            # The genuine customer lead is untouched and keeps its CGPA-based tier.
            assert rows['Noor Ul Ain']['classification'] == 'potential_lead'
            assert rows['Noor Ul Ain']['lead_tier'] == 'hot'  # cgpa 3.4 -> n8n Hot band
            # Summary counts reflect the split.
            assert s['potential_leads'] == 1
            assert s['possible_internal'] == 1
    finally:
        eng.dispose()
