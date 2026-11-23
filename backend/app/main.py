import hashlib, json, re, uuid
from pathlib import Path
from zoneinfo import ZoneInfo
from datetime import datetime, timezone, timedelta, date, time
from contextlib import asynccontextmanager
from sqlalchemy import select, func, distinct, and_, or_, not_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from fastapi import FastAPI, Depends, HTTPException, Response, Query
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from . import models
from .db import get_db, create_tables
from .security import hash_password, check_password, token_for, current_user, admin_only, assert_scope
from .schemas import SignUp, Login, Approval, SyncIn, AuditRequest, ContactCorrection, VoiceUpload, VoiceFailure, AdminPasswordSet
from .analysis import classify, build_summary, group_conversation_condition
from .config import production_check
from .sync_windows import since_for_sync
from .media_recovery import can_promote_image_to_voice, can_promote_call_placeholder
from .legacy_dates import infer_date_order, recover_message_date, recover_with_company_evidence
from .metrics import is_call_event, is_message_record
from .voice_storage import decode_audio_url, write_audio, read_audio
from .chat_overview import analyze_message_rows,resolve_from_me,call_duration_seconds,collapse_echoes
from .inbox_ordering import recent_conversation_order

@asynccontextmanager
async def lifespan(app):
    production_check()
    create_tables()
    yield

app=FastAPI(title='Scholarshiphive CSR API',version='3.0.0', lifespan=lifespan, docs_url='/docs')
_WEB = Path(__file__).resolve().parents[2] / 'admin-web'
if _WEB.exists():
    app.mount('/admin-assets', StaticFiles(directory=str(_WEB)), name='admin-assets')
    @app.get('/admin', include_in_schema=False)
    def admin_page():
        return FileResponse(str(_WEB / 'index.html'), headers={'Cache-Control':'no-store'})


def person(u):
    return {'id':u.id,'name':u.full_name,'email':u.email,'employee_code':u.employee_code,'phone':u.phone,
            'whatsapp_number':u.whatsapp_number,'department':u.department,'designation':u.designation,
            'role':u.role,'approved':u.approved,'active':u.active,'created_at':u.created_at.isoformat()}

def log_event(db,actor,action,subject=None):
    db.add(models.SecurityEvent(actor_id=actor,action=action,subject_id=subject))

@app.get('/health')
def health():return {'ok':True,'service':'csr-api'}

@app.post('/auth/signup',status_code=201)
def signup(data:SignUp,db:Session=Depends(get_db)):
    number=re.sub(r'\s+','',data.whatsapp_number)
    if not re.fullmatch(r'\+?[0-9]{7,18}',number):raise HTTPException(422,'Enter your WhatsApp number with country code')
    # PostgreSQL users.id is an auto-incrementing integer. Allocate the record first,
    # then issue a public EMP-xxxxxxxx code from its immutable primary key.
    # A unique temporary code is used only inside this single DB transaction.
    u=models.User(full_name=data.full_name.strip(),email=str(data.email).lower(),
        employee_code='TMP-'+uuid.uuid4().hex,whatsapp_number=number,
        password_hash=hash_password(data.password),phone=data.phone.strip(),
        department=data.department.strip(),designation=data.designation.strip(),
        role='employee',approved=False)
    db.add(u)
    try:
        db.flush()  # Allocates users.id without committing a temporary employee code.
        code=f'EMP-{u.id:08d}'
        # Preserve any legacy manually assigned IDs; avoid colliding with existing codes.
        suffix=1
        while db.scalar(select(models.User.id).where(models.User.employee_code==code,models.User.id!=u.id)) is not None:
            code=f'EMP-{u.id:08d}-{suffix}'
            suffix+=1
        u.employee_code=code
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409,'Email or WhatsApp number already registered')
    return {'ok':True,'message':f'Signup received. Your Employee ID is {u.employee_code}. Admin approval required before login.',
            'user_id':u.id,'employee_code':u.employee_code}

@app.post('/auth/login')
def login(data:Login,db:Session=Depends(get_db)):
    u=db.scalar(select(models.User).where(models.User.email==str(data.email).lower()))
    if not u or not check_password(data.password,u.password_hash):raise HTTPException(401,'Invalid email or password')
    if not u.approved:raise HTTPException(403,'Pending admin approval')
    if not u.active:raise HTTPException(403,'Account disabled')
    log_event(db,u.id,'login',u.id);db.commit()
    return {'access_token':token_for(u),'token_type':'bearer','user':person(u)}

@app.get('/auth/me')
def me(user:models.User=Depends(current_user)):return person(user)

@app.post('/auth/logout')
def logout(user:models.User=Depends(current_user),db:Session=Depends(get_db)):
    user.token_version+=1;log_event(db,user.id,'logout',user.id);db.commit()
    return {'ok':True}

@app.get('/admin/employees')
def employees(user:models.User=Depends(admin_only),db:Session=Depends(get_db)):
    return {'employees':[person(u) for u in db.scalars(select(models.User).order_by(models.User.id)).all()]}

@app.get('/admin/employee-cards')
def admin_employee_cards(start:date|None=None,end:date|None=None,
                         user:models.User=Depends(admin_only),db:Session=Depends(get_db)):
    """Small admin-only aggregates for counselor cards; never exposes chat content.

    Date-filtered chats use exactly the saved/updated OR dated message rule
    used by /admin/analytics and /conversations. Messages use event dates only.
    Unread is intentionally the latest per-counselor snapshot, not historical.
    """
    if (start is None)!=(end is None):
        raise HTTPException(422,'Provide both start and end dates or neither')
    if start is not None and (end<start or (end-start).days>730):
        raise HTTPException(422,'Select a valid range of up to 731 days')
    begin=stop=None
    if start is not None:
        tz=ZoneInfo('Asia/Karachi')
        begin=datetime.combine(start,time.min,tzinfo=tz).astimezone(timezone.utc)
        stop=datetime.combine(end+timedelta(days=1),time.min,tzinfo=tz).astimezone(timezone.utc)
    cq=(select(models.Conversation.employee_id,func.count(models.Conversation.id))
         .group_by(models.Conversation.employee_id))
    if begin is not None:
        cq=cq.where(or_(
            and_(models.Conversation.first_seen_at>=begin,models.Conversation.first_seen_at<stop),
            and_(models.Conversation.last_seen_at>=begin,models.Conversation.last_seen_at<stop),
            select(models.Message.id).where(
                models.Message.conversation_id==models.Conversation.id,
                models.Message.occurred_at>=begin,models.Message.occurred_at<stop,
                is_message_record(models.Message.media)).exists()
        ))
    conversation_counts=dict(db.execute(cq).all())
    mq=(select(models.Conversation.employee_id,func.count(models.Message.id))
        .join(models.Message,models.Message.conversation_id==models.Conversation.id)
        .where(is_message_record(models.Message.media))
        .group_by(models.Conversation.employee_id))
    if begin is not None:
        mq=mq.where(models.Message.occurred_at>=begin,models.Message.occurred_at<stop)
    message_counts=dict(db.execute(mq).all())
    latest_ids=(select(models.SyncLog.employee_id,func.max(models.SyncLog.id).label('latest_id'))
                .group_by(models.SyncLog.employee_id).subquery())
    unread=dict(db.execute(
        select(models.SyncLog.employee_id,models.SyncLog.unread_excluded)
        .join(latest_ids,models.SyncLog.id==latest_ids.c.latest_id)).all())
    people=db.scalars(select(models.User).where(models.User.role=='employee').order_by(models.User.id)).all()
    items=[{'employee_id':u.id,'name':u.full_name,'employee_code':u.employee_code,
            'conversations':conversation_counts.get(u.id,0),'messages':message_counts.get(u.id,0),
            'unread_excluded':unread.get(u.id,0)} for u in people]
    items.sort(key=lambda item:(-item['conversations'],item['name'].lower(),item['employee_id']))
    return {'scope':'date_range' if begin is not None else 'all_time','employees':items,
            'note':'Unread excluded is the latest sync snapshot. Date-filtered messages require a source event date.'}


@app.patch('/admin/employees/{employee_id}')
def change_employee(employee_id:int,change:Approval,user:models.User=Depends(admin_only),db:Session=Depends(get_db)):
    target=db.get(models.User,employee_id)
    if not target:raise HTTPException(404,'Employee not found')
    if target.role=='admin':raise HTTPException(403,'Admin status cannot be modified here')
    if change.approved is not None:target.approved=change.approved
    if change.active is not None:target.active=change.active
    target.token_version+=1
    log_event(db,user.id,'employee_status_changed',target.id);db.commit()
    return {'ok':True,'employee':person(target)}

@app.post('/admin/employees/{employee_id}/password')
def set_employee_password(employee_id:int,data:AdminPasswordSet,user:models.User=Depends(admin_only),db:Session=Depends(get_db)):
    # Admin sets a counselor's password from the Team tab. Only employee accounts can
    # be changed here (never another admin). Existing employee sessions are invalidated.
    target=db.get(models.User,employee_id)
    if not target:raise HTTPException(404,'Employee not found')
    if target.role!='employee':raise HTTPException(403,'Only employee passwords can be changed here')
    target.password_hash=hash_password(data.password)
    target.token_version+=1
    log_event(db,user.id,'employee_password_reset',target.id);db.commit()
    return {'ok':True,'employee_id':target.id}

@app.get('/dashboard')
def dashboard(employee_id:int|None=None,user:models.User=Depends(current_user),db:Session=Depends(get_db)):
    is_admin=user.role=='admin'
    if is_admin:
        if employee_id is not None:
            selected=db.get(models.User,employee_id)
            if not selected or selected.role!='employee':
                raise HTTPException(404,'Employee not found')
        target_id=employee_id
    else:
        if employee_id is not None and employee_id!=user.id:
            raise HTTPException(403,'You can access only your own records')
        target_id=user.id

    c_stmt=select(func.count()).select_from(models.Conversation)
    m_stmt=select(func.count()).select_from(models.Message).join(models.Conversation)
    call_stmt=select(func.count()).select_from(models.Message).join(models.Conversation).where(is_call_event(models.Message.media))
    # Voice notes, media and text remain messages. WhatsApp call system placeholders
    # are retained separately, never misrepresented as counselor messages.
    m_stmt=m_stmt.where(is_message_record(models.Message.media))
    a_stmt=select(models.AuditJob.status,func.count()).group_by(models.AuditJob.status)
    sync_stmt=select(models.SyncLog).order_by(models.SyncLog.id.desc())
    if target_id is not None:
        c_stmt=c_stmt.where(models.Conversation.employee_id==target_id)
        m_stmt=m_stmt.where(models.Conversation.employee_id==target_id)
        call_stmt=call_stmt.where(models.Conversation.employee_id==target_id)
        a_stmt=a_stmt.where(models.AuditJob.employee_id==target_id)
        sync_stmt=sync_stmt.where(models.SyncLog.employee_id==target_id)
    counts=dict(db.execute(a_stmt).all())
    latest=db.scalars(sync_stmt.limit(1)).first()
    checkpoint=db.get(models.SyncCheckpoint,target_id) if target_id is not None else None
    if target_id is not None:
        unread=latest.unread_excluded if latest else 0
    else:
        # Company aggregate: latest unread snapshot per employee, NOT a sum of every sync.
        latest_per_employee=db.execute(select(models.SyncLog.employee_id,func.max(models.SyncLog.id))
            .join(models.User,models.User.id==models.SyncLog.employee_id)
            .where(models.User.role=='employee')
            .group_by(models.SyncLog.employee_id)).all()
        ids=[x[1] for x in latest_per_employee]
        unread=sum(x.unread_excluded for x in db.scalars(select(models.SyncLog)
            .where(models.SyncLog.id.in_(ids))).all()) if ids else 0
    return {'role':user.role,'selected_employee_id':target_id if is_admin else user.id,
        'employees':db.scalar(select(func.count()).select_from(models.User)
            .where(models.User.role=='employee')) if is_admin else 1,
        'chats':db.scalar(c_stmt),'messages':db.scalar(m_stmt),'call_placeholders':db.scalar(call_stmt),
        'unread_excluded':unread,
        'pending_audits':counts.get('pending',0)+counts.get('processing',0),
        'completed_audits':counts.get('completed',0),
        'last_sync_at':(checkpoint.last_completed_at.isoformat() if checkpoint and checkpoint.last_completed_at else (latest.created_at.isoformat() if latest and (target_id is None or not db.scalar(select(models.SyncRun.id).where(models.SyncRun.employee_id==target_id).limit(1))) else None)),
        'latest_sync_status':latest.status if latest else 'never',
        'note':'Unread metric is last observed excluded count, not guaranteed live WhatsApp state.'}

@app.post('/sync/start')
def start_sync(user:models.User=Depends(current_user),db:Session=Depends(get_db)):
    if user.role!='employee':raise HTTPException(403,'Employee sync only')
    now_at=datetime.now(timezone.utc)
    checkpoint=db.get(models.SyncCheckpoint,user.id)
    previous=checkpoint.last_completed_at if checkpoint else None
    # First successful import: eight rolling 24-hour days. Subsequent syncs:
    # bounded overlap also rechecks media that became visible after an earlier sync.
    since_at=since_for_sync(now_at, previous)
    if (now_at-since_at).days>729:
        raise HTTPException(409,'Sync gap exceeds collector history limit; contact the admin for review')
    run=models.SyncRun(id=str(uuid.uuid4()),employee_id=user.id,since_at=since_at,
                       planned_until=now_at,initial=previous is None)
    db.add(run);db.commit()
    return {'run_id':run.id,'since_at':since_at.isoformat(),
            'until_at':now_at.isoformat(),'initial':run.initial,
            'window_hours':max(1,(now_at-since_at).total_seconds()/3600)}

@app.post('/sync/finish')
def finish_sync(data:dict,user:models.User=Depends(current_user),db:Session=Depends(get_db)):
    if user.role!='employee':raise HTTPException(403,'Employee sync only')
    run=db.get(models.SyncRun,str(data.get('run_id','')))
    if not run or run.employee_id!=user.id:raise HTTPException(404,'Sync run not found')
    if run.status=='completed':return {'ok':True,'completed_at':run.completed_at.isoformat(),'already_completed':True}
    if run.status!='processing':raise HTTPException(409,'Sync run is not active')
    if run.batches_saved<1:raise HTTPException(409,'Cannot finish a sync without an acknowledged upload')
    checkpoint=db.get(models.SyncCheckpoint,user.id)
    if not checkpoint:
        checkpoint=models.SyncCheckpoint(employee_id=user.id)
        db.add(checkpoint)
    # Never move a checkpoint backwards when two browser windows overlap.
    existing=checkpoint.last_completed_at
    if not existing or run.planned_until>existing:checkpoint.last_completed_at=run.planned_until
    checkpoint.updated_at=datetime.now(timezone.utc)
    run.status='completed';run.completed_at=datetime.now(timezone.utc)
    db.commit()
    return {'ok':True,'completed_at':checkpoint.last_completed_at.isoformat()}

@app.post('/sync/chats')
def sync_chats(data:SyncIn,user:models.User=Depends(current_user),db:Session=Depends(get_db)):
    # A user can sync only into their own server-selected employee account. Never trust employee_id from client.
    if user.role!='employee':raise HTTPException(403,'Employee sync only')
    run=None
    if data.sync_run_id:
        run=db.get(models.SyncRun,data.sync_run_id)
        if not run or run.employee_id!=user.id or run.status!='processing':
            raise HTTPException(409,'Invalid or inactive sync run')
    new_messages=0;new_call_placeholders=0;review=0
    voice_assets_added=0
    # A single employee's WhatsApp session has one date locale. Trusted exact
    # source/event pairs can disambiguate old strings such as 10/11/2026.
    # Limit the sample and never use previously recovered/inferred times as proof.
    dated_evidence=db.execute(select(
        models.Message.timestamp,models.Message.occurred_at,models.Message.time_quality
    ).join(models.Conversation).where(
        models.Conversation.employee_id==user.id,
        models.Message.occurred_at.is_not(None),
        models.Message.time_quality=='exact'
    ).order_by(models.Message.id.desc()).limit(3000)).all()
    employee_order=infer_date_order([r[0] for r in dated_evidence],dated_evidence)
    # Cross-employee source/exact-event evidence can help only when this
    # employee has no own locale signal AND the alternative interpretation
    # conflicts with the original eight-day ingestion window.
    # Original raw timestamps across company employees may include hard
    # calendar signals such as 31/10, even when occurred_at was recovered.
    # The fallback still requires the alternative interpretation to be
    # inconsistent with each message's original eight-day insertion window.
    company_evidence=db.execute(select(
        models.Message.timestamp,models.Message.occurred_at,models.Message.time_quality
    ).join(models.Conversation).join(models.User,models.Conversation.employee_id==models.User.id).where(
        models.User.role=='employee'
    ).order_by(models.Message.id.desc()).limit(20000)).all()
    company_order=infer_date_order([r[0] for r in company_evidence],company_evidence)
    for chat in data.chats:
        external=(chat.id or chat.title).strip().casefold()
        key=hashlib.sha256(external.encode('utf-8')).hexdigest()
        c=db.scalar(select(models.Conversation).where(models.Conversation.employee_id==user.id,models.Conversation.external_key==key))
        if not c:
            c=models.Conversation(employee_id=user.id,external_key=key,title=chat.title,contact_number=chat.contact_number,needs_review=chat.needs_review,review_reason=chat.review_reason)
            db.add(c);db.flush()
        else:
            c.title=chat.title
            if chat.contact_number:c.contact_number=chat.contact_number
            # Successful extraction can clear an earlier needs_review marker.
            c.needs_review=bool(chat.needs_review and not chat.messages)
            c.review_reason=chat.review_reason if c.needs_review else ''
        if c.needs_review:review+=1
        # Load fingerprints once. A duplicate can enrich an old record's missing
        # event timestamp without adding a message or changing any other data.
        # This is critical for v2 records imported before `occurred_at` existed.
        known=set(db.scalars(select(models.Message.fingerprint).where(models.Message.conversation_id==c.id)).all())
        existing_voice_ids=set(db.scalars(select(models.Message.source_message_id).where(
            models.Message.conversation_id==c.id,
            models.Message.media.in_(['voice','audio']),models.Message.source_message_id!='')).all())
        existing_source_ids=set(db.scalars(select(models.Message.source_message_id).where(
            models.Message.conversation_id==c.id,
            models.Message.source_message_id!='')).all())
        undated={m.fingerprint:m for m in db.scalars(select(models.Message).where(
            models.Message.conversation_id==c.id,models.Message.occurred_at.is_(None))).all()}
        inserted_here=0
        # Per-chat exact epochs supplement employee-level date-order evidence.
        incoming_evidence=[]
        for sample in chat.messages:
            if sample.timestamp_ms is None or sample.timestamp_quality!='exact':
                continue
            try:
                sample_dt=datetime.fromtimestamp(sample.timestamp_ms/1000,timezone.utc)
                incoming_evidence.append((sample.timestamp,sample_dt,'exact'))
            except (ValueError,OSError,OverflowError):
                continue
        local_order=infer_date_order([m.timestamp for m in chat.messages],incoming_evidence)
        order=local_order or employee_order
        if local_order and employee_order and local_order!=employee_order:
            # Conflicting locale signals: do not force ambiguous source dates.
            order=None
        inserted_at=datetime.now(timezone.utc)
        occurrences={}
        for m in chat.messages:
            # Direction is established by the original WhatsApp message ID
            # whenever it explicitly identifies the owner of the message.
            source=(m.source_message_id or '').strip()
            if source and re.match(r'^(?:true|false)_[^\s|]{6,}$',source,re.I):
                m.fromMe=source.lower().startswith('true_')
                if source in existing_source_ids:
                    # An older WhatsApp DOM can expose an audio avatar before
                    # the actual player. If that same trusted message ID was
                    # saved as an *empty image placeholder*, upgrade it safely
                    # without creating a second message or changing text.
                    if (m.media or '').lower() in ('voice', 'audio'):
                        saved=db.scalar(select(models.Message).where(
                            models.Message.conversation_id==c.id,
                            models.Message.source_message_id==source))
                        if saved and can_promote_image_to_voice(
                            saved_media=saved.media, saved_text=saved.text,
                            incoming_media=m.media, existing_source=saved.source_message_id,
                            incoming_source=source):
                            saved.media='voice'
                            if m.mediaDuration:
                                saved.media_duration=m.mediaDuration
                            voice_asset=db.scalar(select(models.VoiceAsset).where(
                                models.VoiceAsset.message_id==saved.id))
                            if not voice_asset:
                                db.add(models.VoiceAsset(message_id=saved.id,status='pending'))
                                voice_assets_added+=1
                            existing_voice_ids.add(source)
                    # v4.9: a formerly missed real call event could have been
                    # saved as an EMPTY media placeholder. Only a strong exact
                    # ID match and pre-existing system-call wording qualify.
                    elif (m.media or '').strip().lower() == 'call':
                        saved=db.scalar(select(models.Message).where(
                            models.Message.conversation_id==c.id,
                            models.Message.source_message_id==source))
                        if saved and can_promote_call_placeholder(
                            saved_media=saved.media, saved_text=saved.text,
                            incoming_media=m.media, existing_source=saved.source_message_id,
                            incoming_source=source):
                            saved.media='call'
                            if m.mediaDuration:saved.media_duration=m.mediaDuration
                    continue
                existing_source_ids.add(source)
            # Current WhatsApp exposes a bare message id (uppercase hex, no
            # true_/false_ prefix). The legacy block above skips it, so these
            # never reached existing_source_ids and text duplicates slipped
            # through to fingerprint de-dup -- which changes whenever a direction
            # correction flips from_me, creating a second row for the SAME
            # message. Key on the stable message id instead: if already saved,
            # update its direction/sender in place and never insert a duplicate.
            # (Direction itself comes from the extension's verified from_me; a
            #  bare id does not encode message ownership.)
            if source and not re.match(r'^(?:true|false)_', source, re.I):
                if source in existing_source_ids:
                    saved=db.scalar(select(models.Message).where(
                        models.Message.conversation_id==c.id,
                        models.Message.source_message_id==source))
                    if saved:
                        if saved.from_me!=bool(m.fromMe): saved.from_me=bool(m.fromMe)
                        if m.sender and saved.sender!=m.sender: saved.sender=m.sender
                    continue
                existing_source_ids.add(source)
            # Voice without full directional ID: dedup only by exact source ID;
            # never merge recordings solely by duration or timestamp.
            if (m.media or '').lower() in ('voice','audio') and source:
                if source in existing_voice_ids:
                    continue
                existing_voice_ids.add(source)
            common=f'{m.id}\0{m.sender}\0{m.timestamp}\0{m.text}\0{m.media}\0{m.mediaDuration}\0{m.fromMe}'
            n=occurrences.get(common,0);occurrences[common]=n+1
            fingerprint=hashlib.sha256((common+f'\0{n}').encode('utf-8')).hexdigest()
            occurred=None
            if m.timestamp_ms is not None and m.timestamp_quality in ('exact','inferred'):
                try:
                    occurred=datetime.fromtimestamp(m.timestamp_ms/1000,timezone.utc)
                    if not (datetime(2000,1,1,tzinfo=timezone.utc) <= occurred <= datetime.now(timezone.utc)+timedelta(days=2)):
                        occurred=None
                except (ValueError,OSError,OverflowError):occurred=None
            quality=m.timestamp_quality if occurred else 'unknown'
            if occurred is None and (m.timestamp or '').strip():
                # Fallback for source text that the DOM couldn't normalize.
                # Ambiguous dates are accepted only with established date order.
                occurred=recover_message_date(m.timestamp,inserted_at,order)
                if occurred is None and order is None and not local_order and not employee_order:
                    occurred=recover_with_company_evidence(m.timestamp,inserted_at,company_order)
                if occurred is not None:quality='recovered'
            if fingerprint not in known:
                known.add(fingerprint)
                message_row=models.Message(conversation_id=c.id,fingerprint=fingerprint,sender=m.sender,from_me=m.fromMe,
                    text=m.text,timestamp=m.timestamp,media=m.media,media_duration=m.mediaDuration,
                    source_message_id=m.source_message_id,occurred_at=occurred,time_quality=quality)
                db.add(message_row)
                if (m.media or '').lower() in ('voice','audio'):
                    db.flush()
                    db.add(models.VoiceAsset(message_id=message_row.id,status='pending' if m.source_message_id else 'source_missing'))
                    voice_assets_added+=1
                # A call event is persisted, but isn't a newly saved chat message.
                if (m.media or '').strip().lower() == 'call':
                    new_call_placeholders+=1
                else:
                    new_messages+=1
                inserted_here+=1
            else:
                if fingerprint in undated and occurred is not None:
                    undated[fingerprint].occurred_at=occurred
                    undated[fingerprint].time_quality=quality
                if (m.media or '').lower() in ('voice','audio') and m.source_message_id:
                    existing_voice=db.scalar(select(models.Message).where(
                        models.Message.conversation_id==c.id,models.Message.fingerprint==fingerprint))
                    if existing_voice:
                        if not existing_voice.source_message_id:
                            existing_voice.source_message_id=m.source_message_id
                        asset=db.scalar(select(models.VoiceAsset).where(models.VoiceAsset.message_id==existing_voice.id))
                        if not asset:
                            db.add(models.VoiceAsset(message_id=existing_voice.id,status='pending'))
                            voice_assets_added+=1
                        elif asset.status=='source_missing':
                            asset.status='pending'
        if inserted_here:c.last_seen_at=models.now()
        # Business category is independent of needs_review (spec 2): a chat that
        # needs review still keeps its real lead/staff/unclassified category.
        if chat.messages or c.needs_review:c.state=classify(' '.join(m.text for m in chat.messages))
    log=models.SyncLog(employee_id=user.id,conversations_seen=len(data.chats),new_messages=new_messages,
                       unread_excluded=data.unread_count,review_count=review,window_hours=data.window_hours)
    db.add(log)
    if run:run.batches_saved+=1
    db.commit()
    return {'ok':True,'conversations_seen':len(data.chats),'new_messages':new_messages,
            'new_call_placeholders':new_call_placeholders,'voice_assets_queued':voice_assets_added,'needs_review':review,
            'unread_excluded':data.unread_count,'sync_id':log.id}

@app.get('/sync/voice-pending')
def voice_pending(limit:int=Query(12,ge=1,le=40),user:models.User=Depends(current_user),db:Session=Depends(get_db)):
    if user.role!='employee':raise HTTPException(403,'Employee voice sync only')
    # Retrieve only own, never uploaded, bounded retry candidates. No file data in response.
    rows=db.execute(select(models.VoiceAsset,models.Message.source_message_id).join(models.Message,
        models.VoiceAsset.message_id==models.Message.id).join(models.Conversation,
        models.Message.conversation_id==models.Conversation.id).where(
        models.Conversation.employee_id==user.id,
        models.VoiceAsset.status.in_(['pending','retry']),
        models.VoiceAsset.attempts<3,
        models.Message.source_message_id!='').order_by(models.VoiceAsset.id).limit(limit)).all()
    return {'voices':[{'message_id':voice.message_id,'source_message_id':source} for voice,source in rows]}

@app.post('/sync/voice-upload')
def voice_upload(data:VoiceUpload,user:models.User=Depends(current_user),db:Session=Depends(get_db)):
    if user.role!='employee':raise HTTPException(403,'Employee voice sync only')
    voice=db.scalar(select(models.VoiceAsset).join(models.Message,
        models.VoiceAsset.message_id==models.Message.id).join(models.Conversation,
        models.Message.conversation_id==models.Conversation.id).where(
        models.VoiceAsset.message_id==data.message_id,
        models.Conversation.employee_id==user.id))
    if not voice:raise HTTPException(404,'Voice record not found')
    if voice.status=='available':return {'ok':True,'already_saved':True}
    if voice.attempts>=3:raise HTTPException(409,'Voice retry limit reached')
    try:audio,mime,ext,digest=decode_audio_url(data.data_url)
    except ValueError as err:raise HTTPException(422,str(err))
    # Primary store is Postgres so audio survives container redeploys (the local disk
    # is ephemeral on Railway and previously wiped saved voices). The on-disk copy is
    # now a best-effort cache only and never blocks saving.
    try:key=write_audio(data.message_id,audio,ext,digest)
    except OSError:key=''
    voice.audio_data=audio
    voice.mime=mime;voice.storage_key=key;voice.sha256=digest;voice.byte_size=len(audio)
    voice.status='available';voice.error='';voice.updated_at=datetime.now(timezone.utc)
    db.commit()
    return {'ok':True,'bytes_saved':len(audio)}

@app.post('/sync/voice-failure')
def voice_failure(data:VoiceFailure,user:models.User=Depends(current_user),db:Session=Depends(get_db)):
    if user.role!='employee':raise HTTPException(403,'Employee voice sync only')
    voice=db.scalar(select(models.VoiceAsset).join(models.Message,
        models.VoiceAsset.message_id==models.Message.id).join(models.Conversation,
        models.Message.conversation_id==models.Conversation.id).where(
        models.VoiceAsset.message_id==data.message_id,
        models.Conversation.employee_id==user.id))
    if not voice:raise HTTPException(404,'Voice record not found')
    if voice.status=='available':return {'ok':True,'status':'available'}
    voice.attempts+=1
    voice.status='failed' if voice.attempts>=3 else 'retry'
    voice.error=data.reason[:220];voice.updated_at=datetime.now(timezone.utc)
    db.commit()
    return {'ok':True,'status':voice.status,'attempts':voice.attempts}

@app.post('/admin/voices/{message_id}/retry')
def voice_retry(message_id:int,user:models.User=Depends(admin_only),db:Session=Depends(get_db)):
    asset=db.scalar(select(models.VoiceAsset).where(models.VoiceAsset.message_id==message_id))
    if not asset:raise HTTPException(404,'Voice record not found')
    msg=db.get(models.Message,message_id)
    if not msg or not msg.source_message_id:
        raise HTTPException(409,'No original WhatsApp voice identifier is available')
    if asset.status=='available':return {'ok':True,'status':'available'}
    asset.status='pending';asset.attempts=0;asset.error='';asset.updated_at=datetime.now(timezone.utc)
    db.commit()
    return {'ok':True,'status':'pending','note':'Employee Chrome/WhatsApp must be open to retry audio collection'}

@app.get('/admin/voices/{message_id}')
def voice_file(message_id:int,user:models.User=Depends(admin_only),db:Session=Depends(get_db)):
    asset=db.scalar(select(models.VoiceAsset).where(models.VoiceAsset.message_id==message_id))
    if not asset or asset.status!='available':raise HTTPException(404,'Voice not available')
    _vhdr={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',
           'Content-Security-Policy':"default-src 'none'",
           'Content-Disposition':f'inline; filename="voice-{message_id}"'}
    # Prefer the Postgres copy (survives redeploys); fall back to the legacy on-disk file.
    if asset.audio_data:
        return Response(content=bytes(asset.audio_data),media_type=asset.mime or 'application/octet-stream',headers=_vhdr)
    try:path=read_audio(asset.storage_key)
    except ValueError:raise HTTPException(404,'Invalid voice storage record')
    if not path.is_file():raise HTTPException(404,'Stored voice file missing from disk')
    return FileResponse(str(path),media_type=asset.mime,filename=f'voice-{message_id}',
        content_disposition_type='inline',headers={'Cache-Control':'private, no-store',
        'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"})

def _contact_payload(c:models.Conversation):
    return {
        'id':c.id,'employee_id':c.employee_id,
        'title':c.display_name_override or c.title,
        'raw_title':c.title,
        'contact_number':(c.contact_number_override if c.contact_number_override is not None else c.contact_number) or '',
        'name_corrected':bool(c.display_name_override),
        'number_corrected':c.contact_number_override is not None,
        'state':c.state,'needs_review':c.needs_review,'review_reason':c.review_reason,
        'last_seen_at':c.last_seen_at.isoformat(),
    }


@app.get('/admin/chats/summary')
def admin_chat_summary(employee_id:int|None=None,start:date|None=None,end:date|None=None,
                       state:str=Query('',max_length=40),
                       user:models.User=Depends(admin_only),db:Session=Depends(get_db)):
    """Admin-only overview; returns aggregates, never raw message contents.

    Chats follow the same saved/updated-or-message-date rule as the inbox.
    Message-level response/call statistics require trustworthy event timestamps.
    Unread is the latest employee sync snapshot (not historical for a date filter).
    """
    if (start is None) != (end is None):
        raise HTTPException(422,'Provide both start and end dates')
    if start is not None and (end < start or (end-start).days > 730):
        raise HTTPException(422,'Invalid date range')
    if employee_id is not None:
        owner = db.get(models.User,employee_id)
        if not owner or owner.role != 'employee':
            raise HTTPException(404,'Employee not found')
    begin = stop = None
    if start is not None:
        tz=ZoneInfo('Asia/Karachi')
        begin=datetime.combine(start,time.min,tzinfo=tz).astimezone(timezone.utc)
        stop=datetime.combine(end+timedelta(days=1),time.min,tzinfo=tz).astimezone(timezone.utc)
    cq=select(models.Conversation.id,models.Conversation.state,models.Conversation.needs_review)
    if employee_id is not None:
        cq=cq.where(models.Conversation.employee_id==employee_id)
    if state == 'needs_review':
        cq=cq.where(models.Conversation.needs_review.is_(True))
    elif state:
        cq=cq.where(models.Conversation.state==state)
    if begin is not None:
        # Spec 3 (end-to-end consistency): a conversation belongs to the selected
        # period ONLY if it has at least one message DATED inside it -- exactly the
        # message-level rule the audit uses. This replaces the older first/last_seen
        # overlap, which counted recently-touched chats that had no in-window message
        # and made the dashboard total disagree with the audit's eligible-chats count.
        cq=cq.where(select(models.Message.id).where(models.Message.conversation_id==models.Conversation.id,
                        models.Message.occurred_at>=begin, models.Message.occurred_at<stop).exists())
    conversations = db.execute(cq).all()
    ids={c[0] for c in conversations}
    # Three independent dimensions (spec 2): report the business category breakdown
    # and the needs_review flag SEPARATELY. A chat that needs review is still counted
    # under its real business category -- the two are never conflated or summed.
    classifications={}
    needs_review_total=0
    for cid,category,review in conversations:
        name=category or 'unclassified'
        classifications[name]=classifications.get(name,0)+1
        if review:needs_review_total+=1
    # Never query messages until the employee/date/status-scoped chat set exists.
    # Rows have no text or media bytes, only metadata for counting and response timing.
    if ids:
        msg_rows=db.execute(select(models.Message.id,models.Message.conversation_id,
                models.Message.from_me,models.Message.occurred_at,models.Message.media,
                models.Message.media_duration,models.Message.sender,models.Message.source_message_id,
                models.Conversation.title,models.Conversation.employee_id).join(models.Conversation,
                models.Message.conversation_id==models.Conversation.id).where(models.Message.conversation_id.in_(ids))
                .order_by(models.Message.conversation_id,models.Message.occurred_at,models.Message.id)).yield_per(1000)
    else:
        msg_rows=[]
    employee_names=dict(db.execute(select(models.User.id,models.User.full_name)
                        .where(models.User.role=='employee')).all())
    normalized_rows=((mid,cid,resolve_from_me(outgoing,sender,source,title,
                     employee_names.get(emp_id,'')),dt,media,duration)
                     for mid,cid,outgoing,dt,media,duration,sender,source,title,emp_id in msg_rows)
    metrics=analyze_message_rows(normalized_rows,ids,begin=begin,stop=stop)
    # Unread-excluded counts are latest snapshots, not attributable to an event month.
    uq=select(models.User.id).where(models.User.role=='employee')
    if employee_id is not None:uq=uq.where(models.User.id==employee_id)
    unread=0
    for uid in db.scalars(uq):
        latest=db.scalar(select(models.SyncLog).where(models.SyncLog.employee_id==uid)
                         .order_by(models.SyncLog.id.desc()).limit(1))
        unread += latest.unread_excluded if latest else 0
    return {'employee_id':employee_id,'scope':'date_range' if begin is not None else 'all_time',
            'start':start.isoformat() if start else None,'end':end.isoformat() if end else None,
            'total_conversations':len(ids),'classifications':classifications,
            'needs_review':needs_review_total,
            'unread_excluded_latest':unread,**metrics,
            'note':'Unread is the latest per-employee sync snapshot, not historical. Responses count only timestamp-supported customer-to-counselor pairs. No-reply observed does not imply an SLA violation. Calls are WhatsApp placeholders and call recordings are not available.'}


@app.get('/admin/calls')
def admin_call_events(employee_id:int|None=None,start:date|None=None,end:date|None=None,
                      limit:int=Query(100,ge=1,le=200),user:models.User=Depends(admin_only),
                      db:Session=Depends(get_db)):
    """WhatsApp call event metadata, not recordings or guessed durations."""
    if (start is None)!=(end is None) or (start is not None and (end<start or (end-start).days>730)):
        raise HTTPException(422,'Provide a valid date range or All Time')
    if employee_id is not None:
        owner=db.get(models.User,employee_id)
        if not owner or owner.role!='employee':raise HTTPException(404,'Employee not found')
    q=(select(models.Message,models.Conversation,models.User.full_name)
       .join(models.Conversation,models.Message.conversation_id==models.Conversation.id)
       .join(models.User,models.Conversation.employee_id==models.User.id)
       .where(is_call_event(models.Message.media)))
    if employee_id is not None:q=q.where(models.Conversation.employee_id==employee_id)
    if start is not None:
        tz=ZoneInfo('Asia/Karachi')
        begin=datetime.combine(start,time.min,tzinfo=tz).astimezone(timezone.utc)
        stop=datetime.combine(end+timedelta(days=1),time.min,tzinfo=tz).astimezone(timezone.utc)
        q=q.where(models.Message.occurred_at>=begin,models.Message.occurred_at<stop)
    records=db.execute(q.order_by(models.Message.occurred_at.desc().nullslast(),models.Message.id.desc()).limit(limit)).all()
    events=[]
    for m,c,counselor in records:
        source=str(m.source_message_id or '')
        strong=source.lower().startswith(('true_','false_'))
        outgoing=resolve_from_me(m.from_me,m.sender,source,c.title,counselor)
        actor=counselor if outgoing else (c.display_name_override or c.title)
        events.append({'id':m.id,'conversation_id':c.id,'employee_id':c.employee_id,
            'contact_name':c.display_name_override or c.title,'employee_name':counselor,
            'actor':actor if (strong or outgoing) else 'Caller not confirmed',
            'direction':'outgoing' if outgoing else ('incoming' if strong else 'unverified'),
            'occurred_at':m.occurred_at.isoformat() if m.occurred_at else None,
            'source_time':m.timestamp or '',
            'duration':m.media_duration or '',
            'duration_seconds':call_duration_seconds(m.media_duration)})
    return {'events':events,'returned':len(events),'date_basis':'WhatsApp event date; unknown dates excluded from a date-filtered result',
            'note':'Calls are metadata placeholders. Unverified direction and unknown durations are not guessed.'}


@app.get('/conversations')
def conversations(employee_id:int|None=None,start:date|None=None,end:date|None=None,
                  search:str=Query('',max_length=100),state:str=Query('',max_length=40),
                  activity:str=Query('',max_length=30),kind:str=Query('',max_length=10),
                  limit:int=Query(100,ge=1,le=200),offset:int=Query(0,ge=0),
                  user:models.User=Depends(admin_only),db:Session=Depends(get_db)):
    # Admin-only; apply employee scope before COUNT, pagination, or fetching messages.
    if user.role!='admin':
        raise HTTPException(403,'Admin access only')
    if employee_id is not None:
        u=db.get(models.User,employee_id)
        if not u or u.role!='employee':raise HTTPException(404,'Employee not found')
    q=select(models.Conversation)
    if employee_id is not None:q=q.where(models.Conversation.employee_id==employee_id)
    if state=='needs_review':q=q.where(models.Conversation.needs_review.is_(True))
    elif state:q=q.where(models.Conversation.state==state)
    if search.strip():
        # Bound strings and parameterized predicates; search is scoped to admin.
        term='%'+search.strip().replace('\\','\\\\').replace('%','\\%').replace('_','\\_')+'%'
        q=q.where(or_(models.Conversation.title.ilike(term,escape='\\'),
            models.Conversation.display_name_override.ilike(term,escape='\\'),
            models.Conversation.contact_number.ilike(term,escape='\\'),
            select(models.Message.id).where(models.Message.conversation_id==models.Conversation.id,
                models.Message.text.ilike(term,escape='\\')).exists()))
    if start is not None or end is not None:
        if start is None or end is None or end<start:raise HTTPException(422,'Valid start and end dates are required')
        tz=ZoneInfo('Asia/Karachi')
        begin=datetime.combine(start,time.min,tzinfo=tz).astimezone(timezone.utc)
        stop=datetime.combine(end+timedelta(days=1),time.min,tzinfo=tz).astimezone(timezone.utc)
        # This list follows the dashboard's "saved/updated in period" metric:
        # a chat qualifies when a message's EVENT date matches, OR the chat
        # record was first created/last updated in the selected period.
        # Import/DB activity never becomes a fabricated message event date.
        q=q.where(or_(
            and_(models.Conversation.first_seen_at>=begin,models.Conversation.first_seen_at<stop),
            and_(models.Conversation.last_seen_at>=begin,models.Conversation.last_seen_at<stop),
            select(models.Message.id).where(
                models.Message.conversation_id==models.Conversation.id,
                models.Message.occurred_at>=begin,models.Message.occurred_at<stop).exists()
        ))
    if activity not in ('','calls','voice','replied','no_reply'):
        raise HTTPException(422,'Unknown activity filter')
    if activity in ('calls','voice'):
        kinds=['call'] if activity=='calls' else ['voice','audio']
        sub=select(models.Message.id).where(models.Message.conversation_id==models.Conversation.id,
              models.Message.media.in_(kinds))
        # Chat cohort uses saved/updated date plus dated-message event activity.
        # Under a date range, only timestamped events establish event-type membership.
        if start is not None:sub=sub.where(models.Message.occurred_at>=begin,models.Message.occurred_at<stop)
        q=q.where(sub.exists())
    elif activity in ('replied','no_reply'):
        if employee_id is None:
            raise HTTPException(422,'Select a counselor to filter response status')
        candidate_ids=list(db.scalars(q.with_only_columns(models.Conversation.id).order_by(None)).all())
        if candidate_ids:
            owner_name=db.scalar(select(models.User.full_name).where(models.User.id==employee_id)) or ''
            rows=db.execute(select(models.Message.id,models.Message.conversation_id,models.Message.from_me,
                models.Message.occurred_at,models.Message.media,models.Message.media_duration,
                models.Message.sender,models.Message.source_message_id,models.Conversation.title).join(models.Conversation,models.Message.conversation_id==models.Conversation.id).where(models.Message.conversation_id.in_(candidate_ids))
                .order_by(models.Message.conversation_id,models.Message.occurred_at,models.Message.id))
            reconciled=((mid,cid,resolve_from_me(outgoing,sender,src,title,owner_name),dt,media,dur)
                        for mid,cid,outgoing,dt,media,dur,sender,src,title in rows)
            result=analyze_message_rows(reconciled,set(candidate_ids),
                begin=begin if start is not None else None,stop=stop if start is not None else None,
                include_chat_ids=True)
            q=q.where(models.Conversation.id.in_(result['response_chat_ids'][activity]))
        else:
            q=q.where(False)
    # Chats vs Groups split (derived from stored data; no re-sync needed).
    if kind not in ('','chats','groups'):
        raise HTTPException(422,'Unknown kind filter')
    if kind=='groups':
        q=q.where(group_conversation_condition())
    elif kind=='chats':
        q=q.where(not_(group_conversation_condition()))
    total=db.scalar(select(func.count()).select_from(q.order_by(None).subquery())) or 0
    # WhatsApp-like newest-first inbox: message event time takes priority.
    # DB last_seen_at is sync/import time and changes when old conversations
    # are re-imported, so it must not reorder dated conversations. Chats
    # without reliable message dates use their saved timestamp as fallback.
    rows=db.scalars(q.order_by(*recent_conversation_order(models.Conversation,models.Message))
                   .offset(offset).limit(limit)).all()
    ids=[c.id for c in rows]
    latest_msg=dict(db.execute(select(models.Message.conversation_id,func.max(models.Message.occurred_at))
                    .where(models.Message.conversation_id.in_(ids))
                    .group_by(models.Message.conversation_id)).all()) if ids else {}
    result=[]
    for c in rows:
        item=_contact_payload(c)
        dt=latest_msg.get(c.id)
        item['last_message_at']=dt.isoformat() if dt else None
        latest=db.scalar(select(models.Message).where(models.Message.conversation_id==c.id).order_by(models.Message.id.desc()).limit(1))
        item['last_preview']=(latest.text[:130] if latest and latest.text else ('['+latest.media+']' if latest and latest.media else 'No preview available'))
        result.append(item)
    return {'conversations':result,'total':total,'offset':offset,'limit':limit,'has_more':offset+len(rows)<total,
            'date_basis':'event_or_saved_record_activity' if start is not None else 'all_saved'}


@app.get('/conversations/{conversation_id}')
def conversation_detail(conversation_id:int,user:models.User=Depends(admin_only),db:Session=Depends(get_db)):
    c=db.get(models.Conversation,conversation_id)
    if not c:raise HTTPException(404,'Conversation not found')
    msgs=db.scalars(select(models.Message).where(models.Message.conversation_id==c.id)
                    .order_by(models.Message.occurred_at.asc().nullslast(),models.Message.id).limit(1500)).all()
    statuses={asset.message_id:asset for asset in db.scalars(select(models.VoiceAsset).where(
        models.VoiceAsset.message_id.in_([m.id for m in msgs]))).all()} if msgs else {}
    employee=db.get(models.User,c.employee_id)
    employee_name=(employee.full_name if employee else '')
    def direction_evidence(m):
        src=str(m.source_message_id or '').strip().lower()
        if src.startswith(('true_','false_')):return 'whatsapp_id'
        actor=' '.join(str(m.sender or '').split()).casefold()
        owner=' '.join(employee_name.split()).casefold()
        contact=' '.join(str(c.title or '').split()).casefold()
        if actor in ('you','me'):return 'sender_you'
        if actor and owner and actor!=contact:
            ot=owner.split();at=actor.split()
            if actor==owner or (len(ot)>=2 and at[:len(ot)]==ot):
                return 'employee_name_inferred'
        return 'stored_unverified'
    built=[]
    for m in msgs:
        built.append({'id':m.id,'sender':m.sender,
         'from_me':resolve_from_me(m.from_me,m.sender,m.source_message_id,c.title,employee_name),
         'direction_source':direction_evidence(m),
         'source_id':m.source_message_id,'text':m.text,'timestamp':m.timestamp,
         'occurred_at':m.occurred_at.isoformat() if m.occurred_at else None,
         'media':m.media,'duration':m.media_duration,
         'voice_status':(statuses[m.id].status if m.id in statuses else ('not_captured' if m.media in ('voice','audio') else None)),
         'voice_error':(statuses[m.id].error if m.id in statuses else ''),
         'dt':m.occurred_at})
    # Hide WhatsApp-Web echo duplicates (counselor text mirrored into the customer
    # bubble). Display-only; stored messages are untouched.
    visible=collapse_echoes(built)
    collapsed=len(built)-len(visible)
    for r in visible:r.pop('dt',None)
    return {'conversation':_contact_payload(c),'messages':visible,'echoes_collapsed':collapsed}


@app.patch('/admin/conversations/{conversation_id}/contact')
def update_contact(conversation_id:int,data:ContactCorrection,user:models.User=Depends(admin_only),db:Session=Depends(get_db)):
    c=db.get(models.Conversation,conversation_id)
    if not c:raise HTTPException(404,'Conversation not found')
    if data.display_name is None and data.contact_number is None:
        raise HTTPException(422,'Provide a contact name or number to correct')
    if data.display_name is not None:
        clean=data.display_name.strip()
        if clean and len(clean)<2:raise HTTPException(422,'Contact name must have at least two characters')
        c.display_name_override=clean or None
    if data.contact_number is not None:
        phone=data.contact_number.strip()
        if phone:
            phone=re.sub(r'[\s()\-]','',phone)
            if not re.fullmatch(r'\+?[0-9]{7,18}',phone):
                raise HTTPException(422,'Enter a valid phone number or leave empty to clear override')
        c.contact_number_override=phone or None
    log_event(db,user.id,'contact_metadata_corrected',conversation_id)
    db.commit()
    return {'ok':True,'conversation':_contact_payload(c)}


@app.get('/admin/unread-summary')
def admin_unread_summary(employee_id:int|None=None,user:models.User=Depends(admin_only),db:Session=Depends(get_db)):
    q=select(models.User).where(models.User.role=='employee').order_by(models.User.id)
    if employee_id is not None:q=q.where(models.User.id==employee_id)
    people=db.scalars(q).all()
    if employee_id is not None and not people:raise HTTPException(404,'Employee not found')
    items=[]
    for u in people:
        latest=db.scalar(select(models.SyncLog).where(models.SyncLog.employee_id==u.id)
                         .order_by(models.SyncLog.id.desc()).limit(1))
        checkpoint=db.get(models.SyncCheckpoint,u.id)
        items.append({'employee_id':u.id,'employee_code':u.employee_code,'name':u.full_name,
                      'unread_excluded':latest.unread_excluded if latest else 0,
                      'last_completed_sync_at':checkpoint.last_completed_at.isoformat() if checkpoint and checkpoint.last_completed_at else None,
                      'snapshot_recorded_at':latest.created_at.isoformat() if latest else None})
    return {'unread_excluded':sum(x['unread_excluded'] for x in items),
            'employees':items,
            'note':'Latest recorded unread-excluded count per employee, not a sum across syncs. Unread chat identities are not stored by this collector.'}


@app.post('/audits',status_code=202)
def submit_audit(data:AuditRequest,user:models.User=Depends(admin_only),db:Session=Depends(get_db)):
    target=(data.employee_id if user.role=='admin' and data.employee_id is not None else user.id)
    assert_scope(user,target)
    if not db.get(models.User,target):raise HTTPException(404,'Employee not found')
    # Compute the reporting window at GENERATION TIME (now), in Asia/Karachi, and
    # store explicit UTC bounds so the worker, AI input and PDF all use the exact
    # same message-level window (DB requested-changes spec, 2026-11-17).
    tz=ZoneInfo('Asia/Karachi')
    now_utc=datetime.now(timezone.utc)
    period=(data.period or '').strip().lower()
    rolling={'last_25h':25,'last_7d':168,'last_15d':360,'last_30d':720}
    range_end=now_utc
    if period=='custom' or (data.start is not None or data.end is not None):
        if data.start is None or data.end is None:
            raise HTTPException(422,'Custom range requires both start and end dates')
        if data.end < data.start or (data.end-data.start).days>731:
            raise HTTPException(422,'Select a valid custom range of up to 731 days')
        range_start=datetime.combine(data.start,time.min,tzinfo=tz).astimezone(timezone.utc)
        range_end=datetime.combine(data.end+timedelta(days=1),time.min,tzinfo=tz).astimezone(timezone.utc)
        label=f'{data.start.isoformat()} to {data.end.isoformat()}'
        hours=max(1,round((range_end-range_start).total_seconds()/3600))
    elif period=='current_month':
        now_pkt=now_utc.astimezone(tz)
        first_this=now_pkt.replace(day=1,hour=0,minute=0,second=0,microsecond=0)
        range_start=first_this.astimezone(timezone.utc)
        range_end=now_utc
        label=f'Current month ({now_pkt.strftime("%b %Y")})'
        hours=max(1,round((range_end-range_start).total_seconds()/3600))
    elif period=='previous_month':
        now_pkt=now_utc.astimezone(tz)
        first_this=now_pkt.replace(day=1,hour=0,minute=0,second=0,microsecond=0)
        last_prev_end=first_this  # exclusive end = first of this month
        prev=(first_this-timedelta(days=1)).replace(day=1)
        range_start=prev.astimezone(timezone.utc)
        range_end=last_prev_end.astimezone(timezone.utc)
        label=f'Previous month ({prev.strftime("%b %Y")})'
        hours=max(1,round((range_end-range_start).total_seconds()/3600))
    else:
        hours=rolling.get(period, data.hours or 25)
        labels={25:'Last 25 hours',168:'Last 7 days',360:'Last 15 days',720:'Last 30 days'}
        label=labels.get(hours, f'Last {hours} hours')
        range_start=range_end-timedelta(hours=hours)
    job=models.AuditJob(employee_id=target,requested_by=user.id,hours=hours,
                        range_start=range_start,range_end=range_end,period_label=label)
    db.add(job);log_event(db,user.id,'audit_requested',target);db.commit()
    return {'ok':True,'job_id':job.id,'status':job.status,'period':label}

@app.get('/audits')
def audits(employee_id:int|None=None,start:date|None=None,end:date|None=None,
           limit:int=Query(30,ge=1,le=100),user:models.User=Depends(admin_only),db:Session=Depends(get_db)):
    if user.role!='admin':employee_id=user.id
    q=select(models.AuditJob).order_by(models.AuditJob.id.desc()).limit(limit)
    if employee_id is not None:q=q.where(models.AuditJob.employee_id==employee_id)
    if start is not None or end is not None:
        if start is None or end is None or end<start:raise HTTPException(422,'Valid start and end dates are required')
        tz=ZoneInfo('Asia/Karachi')
        begin=datetime.combine(start,time.min,tzinfo=tz).astimezone(timezone.utc)
        stop=datetime.combine(end+timedelta(days=1),time.min,tzinfo=tz).astimezone(timezone.utc)
        q=q.where(models.AuditJob.created_at>=begin,models.AuditJob.created_at<stop)
    rows=db.scalars(q).all()
    return {'jobs':[{'id':a.id,'employee_id':a.employee_id,'hours':a.hours,'period_label':a.period_label or f'Last {a.hours} hours','status':a.status,'created_at':a.created_at.isoformat(),'error':a.error} for a in rows]}

@app.get('/audits/{job_id}')
def audit_details(job_id:int,user:models.User=Depends(admin_only),db:Session=Depends(get_db)):
    job=db.get(models.AuditJob,job_id)
    if not job:raise HTTPException(404,'Audit not found')
    assert_scope(user,job.employee_id)
    return {'id':job.id,'employee_id':job.employee_id,'hours':job.hours,'period_label':job.period_label or f'Last {job.hours} hours','status':job.status,'created_at':job.created_at.isoformat(),'error':job.error,'summary':json.loads(job.summary_json or '{}')}

@app.get('/audits/{job_id}/pdf')
def audit_pdf(job_id:int,user:models.User=Depends(admin_only),db:Session=Depends(get_db)):
    job=db.get(models.AuditJob,job_id)
    if not job:raise HTTPException(404,'Audit not found')
    assert_scope(user,job.employee_id)
    if job.status!='completed' or not job.pdf_bytes:raise HTTPException(409,'PDF is not ready')
    return Response(job.pdf_bytes,media_type='application/pdf',headers={'Content-Disposition':f'attachment; filename="csr-audit-{job.id}.pdf"','Cache-Control':'no-store'})


@app.get('/admin/analytics')
def admin_analytics(start:date|None=None,end:date|None=None,
                    employee_id:int|None=None,bucket:str='day',
                    user:models.User=Depends(admin_only),db:Session=Depends(get_db)):
    """Optional PKT inclusive date range. No bounds means the full historical dataset."""
    if (start is None)!=(end is None):
        raise HTTPException(422,'Provide both start and end dates or neither for All Time')
    filtered=start is not None
    if filtered and (end<start or (end-start).days>730):
        raise HTTPException(422,'Select a valid range of up to 731 days')
    if bucket not in ('day','month'):raise HTTPException(422,'bucket must be day or month')
    if employee_id is not None:
        u=db.get(models.User,employee_id)
        if not u or u.role!='employee':raise HTTPException(404,'Employee not found')
    tz=ZoneInfo('Asia/Karachi')
    if filtered:
        begin=datetime.combine(start,time.min,tzinfo=tz).astimezone(timezone.utc)
        stop=datetime.combine(end+timedelta(days=1),time.min,tzinfo=tz).astimezone(timezone.utc)
    # Bars rely on captured event timestamps; older undated messages are not guessed.
    stmt=(select(models.Message.occurred_at,models.Message.conversation_id)
          .join(models.Conversation,models.Conversation.id==models.Message.conversation_id)
          .where(models.Message.occurred_at.is_not(None),is_message_record(models.Message.media)))
    if filtered:stmt=stmt.where(models.Message.occurred_at>=begin,models.Message.occurred_at<stop)
    if employee_id is not None:stmt=stmt.where(models.Conversation.employee_id==employee_id)
    events=db.execute(stmt).all()
    counts={};conversations_by_period={}
    for event_time,conversation_id in events:
        local=event_time.astimezone(tz)
        key=local.strftime('%Y-%m' if bucket=='month' else '%Y-%m-%d')
        counts[key]=counts.get(key,0)+1
        conversations_by_period.setdefault(key,set()).add(conversation_id)
    series=[{'period':k,'messages':v,'conversations':len(conversations_by_period[k])} for k,v in sorted(counts.items())]
    dated_chat_ids={cid for ids in conversations_by_period.values() for cid in ids}
    # IMPORTANT: A conversation can be synced (created/updated in our DB)
    # without a trustworthy WhatsApp message date. These are DIFFERENT metrics.
    # Previous UI called the latter "Conversations active in period" and hid
    # chat records containing only undated messages, giving 27 instead of 36.
    # Count saved/updated conversations separately, without inventing event dates.
    if filtered:
        cohort_query=select(models.Conversation.id).where(or_(
            and_(models.Conversation.first_seen_at>=begin,models.Conversation.first_seen_at<stop),
            and_(models.Conversation.last_seen_at>=begin,models.Conversation.last_seen_at<stop),
            models.Conversation.id.in_(dated_chat_ids) if dated_chat_ids else False
        ))
        if employee_id is not None:
            cohort_query=cohort_query.where(models.Conversation.employee_id==employee_id)
        cohort_ids=set(db.scalars(cohort_query).all())
    else:
        cohort_query=select(models.Conversation.id)
        if employee_id is not None:
            cohort_query=cohort_query.where(models.Conversation.employee_id==employee_id)
        cohort_ids=set(db.scalars(cohort_query).all())
    classes={}
    if cohort_ids:
        class_stmt=select(models.Conversation.state,func.count()).where(models.Conversation.id.in_(cohort_ids)).group_by(models.Conversation.state)
        classes=dict(db.execute(class_stmt).all())
    classes={k or 'unclassified':v for k,v in classes.items()}
    reports_stmt=select(models.AuditJob.status,func.count())
    if filtered:reports_stmt=reports_stmt.where(models.AuditJob.created_at>=begin,models.AuditJob.created_at<stop)
    if employee_id is not None:reports_stmt=reports_stmt.where(models.AuditJob.employee_id==employee_id)
    reports=dict(db.execute(reports_stmt.group_by(models.AuditJob.status)).all())
    sync_stmt=select(func.count()).select_from(models.SyncRun).where(models.SyncRun.status=='completed')
    if filtered:sync_stmt=sync_stmt.where(models.SyncRun.completed_at>=begin,models.SyncRun.completed_at<stop)
    if employee_id is not None:sync_stmt=sync_stmt.where(models.SyncRun.employee_id==employee_id)
    unverified=select(func.count()).select_from(models.Message).join(models.Conversation).where(models.Message.occurred_at.is_(None),is_message_record(models.Message.media))
    if filtered:unverified=unverified.where(models.Message.received_at>=begin,models.Message.received_at<stop)
    if employee_id is not None:unverified=unverified.where(models.Conversation.employee_id==employee_id)
    undated_all=select(func.count()).select_from(models.Message).join(models.Conversation).where(models.Message.occurred_at.is_(None),is_message_record(models.Message.media))
    all_saved=select(func.count()).select_from(models.Message).join(models.Conversation).where(is_message_record(models.Message.media))
    all_calls=select(func.count()).select_from(models.Message).join(models.Conversation).where(is_call_event(models.Message.media))
    undated_calls=select(func.count()).select_from(models.Message).join(models.Conversation).where(is_call_event(models.Message.media),models.Message.occurred_at.is_(None))
    dated_calls_in_range=select(func.count()).select_from(models.Message).join(models.Conversation).where(is_call_event(models.Message.media),models.Message.occurred_at.is_not(None))
    if filtered:dated_calls_in_range=dated_calls_in_range.where(models.Message.occurred_at>=begin,models.Message.occurred_at<stop)
    if employee_id is not None:
        undated_all=undated_all.where(models.Conversation.employee_id==employee_id)
        all_saved=all_saved.where(models.Conversation.employee_id==employee_id)
        all_calls=all_calls.where(models.Conversation.employee_id==employee_id)
        undated_calls=undated_calls.where(models.Conversation.employee_id==employee_id)
        dated_calls_in_range=dated_calls_in_range.where(models.Conversation.employee_id==employee_id)
    total_all=db.scalar(all_saved) or 0
    total_undated=db.scalar(undated_all) or 0
    return {'start':start.isoformat() if filtered else None,'end':end.isoformat() if filtered else None,
            'scope':'date_range' if filtered else 'all_time','timezone':'Asia/Karachi','bucket':bucket,
            'employee_id':employee_id,'messages_with_verified_or_inferred_event_time':len(events),
            # Older field remains for callers interested in timestamp-proven
            # message activity. New field is the Admin's saved/updated count.
            'conversations_active_in_range':len(dated_chat_ids),
            'conversations_saved_or_updated_in_range':len(cohort_ids),
            'conversations_without_dated_message_in_range':len(cohort_ids-dated_chat_ids),
            'completed_sync_runs_in_range':db.scalar(sync_stmt),
            'unverified_legacy_messages_received_in_range':db.scalar(unverified),
            'all_saved_messages':total_all,
            'call_placeholders_all_time':db.scalar(all_calls) or 0,
            'call_placeholders_undated_all_time':db.scalar(undated_calls) or 0,
            'dated_call_events_in_range':db.scalar(dated_calls_in_range) or 0,
            'undated_event_messages_all_time':total_undated,
            'dated_messages_outside_selected_range':(total_all-total_undated-len(events)) if filtered else 0,
            'reports':reports,'lead_states':classes,'series':series,
            'note':('Messages exclude WhatsApp call-event placeholders. Call events remain saved separately; undated calls are not assigned an event month.'
                    if not filtered else 'Message counts exclude call placeholders. Charts use WhatsApp message event dates. Conversation count includes chats saved/updated in the system; undated calls are never assigned an event month.')}
