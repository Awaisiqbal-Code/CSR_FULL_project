"""Destructive integration tests: ONLY the dedicated PostgreSQL *_test database."""
import os
from pathlib import Path
from urllib.parse import urlparse
from dotenv import load_dotenv
import pytest

load_dotenv(Path(__file__).resolve().parents[1]/'.env',override=False)
test_url=os.getenv('TEST_DATABASE_URL','').strip()
if not test_url:
    pytest.skip('Set TEST_DATABASE_URL ending _test in backend/.env',allow_module_level=True)
if not test_url.startswith(('postgresql://','postgres://','postgresql+psycopg://')):
    raise RuntimeError('Integration tests only support PostgreSQL')
name=urlparse(test_url.replace('postgresql+psycopg://','postgresql://',1)).path.lstrip('/')
if not name.endswith('_test') or test_url==os.getenv('DATABASE_URL','').strip():
    raise RuntimeError('Refusing to reset a database not ending _test')
os.environ['DATABASE_URL']=test_url
os.environ['APP_ENV']='development'

from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy import select
from fastapi.testclient import TestClient
from app.db import Base,engine,SessionLocal
# CRITICAL DATA-SAFETY GUARD.
# app.db builds its global `engine` the first time *any* test module imports it,
# binding it to whatever DATABASE_URL was set at that moment. If another test
# module imported app.db first (e.g. a SQLite unit test that read the real .env),
# `engine` here can silently point at the PRODUCTION database instead of the
# dedicated *_test one -- and this module runs Base.metadata.drop_all(engine).
# Validate the ACTUAL engine binding, not just the env var, and refuse to run
# (skip, never drop) unless the live engine really targets a *_test database.
_bound=(engine.url.database or '')
if not _bound.endswith('_test'):
    pytest.skip(
        f'Refusing destructive tests: live engine is bound to {_bound!r}, not a *_test '
        'database (likely an import-order collision with another test module).',
        allow_module_level=True,
    )
# Skip (rather than hard-error) when the dedicated *_test database is unreachable
# or not provisioned yet, so a fresh checkout stays green.
try:
    with engine.connect():
        pass
except Exception as _exc:  # noqa: BLE001
    pytest.skip(f'Dedicated test database unreachable ({_bound}): {_exc}',allow_module_level=True)
from app.main import app
from app.models import User,SyncCheckpoint,Message
from app.security import hash_password
from app.worker import process_one


def auth(c,email,password):
    r=c.post('/auth/login',json={'email':email,'password':password})
    assert r.status_code==200,r.text
    return {'Authorization':'Bearer '+r.json()['access_token']}


def test_signup_incremental_admin_analytics_and_report_isolation():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.add(User(full_name='Admin',email='admin@example.com',employee_code='ADMIN',whatsapp_number='+00000000100',role='admin',approved=True,active=True,password_hash=hash_password('admin-pass-123')))
        db.commit()
    with TestClient(app) as c:
        assert c.get('/admin').status_code==200
        a=auth(c,'admin@example.com','admin-pass-123')
        payload={'full_name':'Ali','email':'ali@example.com','whatsapp_number':'+923001234561','password':'ali12345'}
        created=c.post('/auth/signup',json=payload)
        assert created.status_code==201,created.text
        created2=c.post('/auth/signup',json={**payload,'full_name':'Ahmed','email':'ahmed@example.com','whatsapp_number':'+923001234562'})
        assert created2.status_code==201
        rows=c.get('/admin/employees',headers=a).json()['employees']
        for u in rows:
            if u['role']=='employee': assert c.patch('/admin/employees/'+str(u['id']),headers=a,json={'approved':True}).status_code==200
        ali=auth(c,'ali@example.com','ali12345')
        ahmed=auth(c,'ahmed@example.com','ali12345')
        ali_id=next(u['id'] for u in rows if u['email']=='ali@example.com')
        assert c.get('/admin/employees',headers=ali).status_code==403
        assert c.get('/conversations',headers=ali).status_code==403
        assert c.get('/audits',headers=ali).status_code==403
        assert c.post('/audits',headers=ali,json={'employee_id':ali_id,'hours':25}).status_code==403
        assert c.get('/admin/analytics?start=2026-11-01&end=2026-11-12',headers=ali).status_code==403

        first=c.post('/sync/start',headers=ali,json={}).json()
        assert first['initial'] is True
        gap=(datetime.fromisoformat(first['until_at'])-datetime.fromisoformat(first['since_at'])).total_seconds()
        assert abs(gap-8*86400)<1
        now_ms=int(datetime.now(timezone.utc).timestamp()*1000)
        chats={'sync_run_id':first['run_id'],'window_hours':192,'unread_count':2,'chats':[
            {'title':'Scholarship customer','id':'chat-a','messages':[{'id':'msg-1','sender':'Customer','text':'Italy scholarship','timestamp':'today 12:00','timestamp_ms':now_ms,'timestamp_quality':'exact'}]},
            {'title':'Needs review','id':'chat-b','messages':[],'needs_review':True,'review_reason':'No extractable messages'}
        ]}
        r=c.post('/sync/chats',headers=ali,json=chats)
        assert r.status_code==200,r.text
        assert r.json()['new_messages']==1
        assert c.post('/sync/finish',headers=ahmed,json={'run_id':first['run_id']}).status_code==404
        finished=c.post('/sync/finish',headers=ali,json={'run_id':first['run_id']})
        assert finished.status_code==200
        assert c.post('/sync/finish',headers=ali,json={'run_id':first['run_id']}).json()['already_completed']
        second=c.post('/sync/start',headers=ali,json={}).json()
        assert second['initial'] is False
        assert (datetime.fromisoformat(second['until_at'])-datetime.fromisoformat(second['since_at'])).total_seconds()<400
        chats['sync_run_id']=second['run_id']
        # Simulate a legacy v2 message imported before `occurred_at` existed.
        # A repeated sync must upgrade the same row, not insert duplicates.
        with SessionLocal() as db:
            legacy=db.scalar(select(Message).limit(1))
            legacy.occurred_at=None
            legacy.time_quality='unknown'
            db.commit()
        assert c.post('/sync/chats',headers=ali,json=chats).json()['new_messages']==0
        with SessionLocal() as db:
            recovered=db.scalar(select(Message).limit(1))
            assert recovered.occurred_at is not None
            assert recovered.time_quality=='exact'
        assert c.post('/sync/finish',headers=ali,json={'run_id':second['run_id']}).status_code==200
        assert c.get('/dashboard',headers=ali).json()['messages']==1
        # Admin and employee see the same all-time counts for the same DB user.
        admin_dashboard=c.get('/dashboard',headers=a,params={'employee_id':ali_id}).json()
        employee_dashboard=c.get('/dashboard',headers=ali).json()
        for key in ['chats','messages','unread_excluded','last_sync_at']:
            assert admin_dashboard[key]==employee_dashboard[key]
        assert admin_dashboard['chats']==2
        assert c.get('/admin/unread-summary',headers=ali).status_code==403
        unread=c.get('/admin/unread-summary',headers=a,params={'employee_id':ali_id}).json()
        assert unread['unread_excluded']==2
        listing=c.get('/conversations',headers=a,params={'employee_id':ali_id}).json()
        assert listing['total']==2 and len(listing['conversations'])==2
        assert listing['date_basis']=='all_saved'
        assert c.get('/conversations',headers=a,params={'employee_id':999999}).status_code==404
        chat_id=next(x['id'] for x in listing['conversations'] if x['raw_title']=='Scholarship customer')
        correction={'display_name':'Corrected Contact','contact_number':'+923001234567'}
        url=f'/admin/conversations/{chat_id}/contact'
        assert c.patch(url,headers=ali,json=correction).status_code==403
        assert c.patch(url,headers=a,json={'contact_number':'invalid'}).status_code==422
        updated=c.patch(url,headers=a,json=correction)
        assert updated.status_code==200,updated.text
        assert updated.json()['conversation']['title']=='Corrected Contact'
        assert updated.json()['conversation']['contact_number']=='+923001234567'
        # The next employee collection can update raw WhatsApp metadata without
        # overwriting a verified admin correction. No new checkpoint involved.
        repeat={**chats,'sync_run_id':None}
        assert c.post('/sync/chats',headers=ali,json=repeat).status_code==200
        persisted=c.get(f'/conversations/{chat_id}',headers=a).json()['conversation']
        assert persisted['title']=='Corrected Contact'
        assert persisted['raw_title']=='Scholarship customer'
        assert persisted['contact_number']=='+923001234567'
        assert c.get('/conversations',headers=a,params={'employee_id':ali_id,'limit':1,'offset':1}).json()['total']==2
        assert c.get('/dashboard',headers=ahmed).json()['messages']==0
        assert c.get('/conversations',headers=a).status_code==200
        with SessionLocal() as db:
            assert db.get(SyncCheckpoint,ali_id).last_completed_at is not None
            assert db.scalar(select(Message).limit(1)).occurred_at is not None
        today=datetime.now(ZoneInfo('Asia/Karachi')).date().isoformat()
        analytic=c.get('/admin/analytics',headers=a,params={'start':today,'end':today,'bucket':'day','employee_id':ali_id})
        assert analytic.status_code==200,analytic.text
        assert analytic.json()['messages_with_verified_or_inferred_event_time']==1
        assert analytic.json()['conversations_active_in_range']==1
        assert c.get('/admin/analytics',headers=a,params={'start':today,'end':today,'bucket':'month'}).status_code==200
        # All Time is now the default; UI uses /dashboard for the full saved totals.
        all_time=c.get('/admin/analytics',headers=a,params={'employee_id':ali_id,'bucket':'month'})
        assert all_time.status_code==200,all_time.text
        assert all_time.json()['scope']=='all_time'
        assert all_time.json()['start'] is None and all_time.json()['end'] is None
        assert all_time.json()['messages_with_verified_or_inferred_event_time']==1
        assert all_time.json()['conversations_active_in_range']==1
        assert c.get('/admin/analytics',headers=a,params={'start':today}).status_code==422
        assert c.get('/admin/analytics',headers=ali).status_code==403

        job=c.post('/audits',headers=a,json={'employee_id':ali_id,'hours':25})
        assert job.status_code==202,job.text
        assert process_one() is True
        job_id=job.json()['job_id']
        pdf=c.get(f'/audits/{job_id}/pdf',headers=a)
        assert pdf.status_code==200 and pdf.content.startswith(b'%PDF-')
        assert c.get(f'/audits/{job_id}',headers=ali).status_code==403
        assert c.get('/chatbot/ask',headers=ali).status_code==404  # Phase 2 only
        assert c.get('/admin',headers=ali).status_code==200  # Public login shell; protected APIs remain admin-only
