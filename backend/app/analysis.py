"""Conservative, evidence-grounded QA baseline; no invented business outcomes."""
from datetime import datetime, timedelta, timezone
from collections import Counter
import re
import statistics
from sqlalchemy import select, func, or_, and_, not_, distinct
from sqlalchemy.orm import Session, selectinload
from .models import Conversation, Message, SyncLog, User
from . import audit_metrics as am

# Rules spec v1.0 (2026-11-17): business category is ONE of three values and is
# computed independently of reply status and of needs_review / data quality.
#   potential_lead / internal_staff / unclassified
# A single generic keyword ("university", "apply", "portal", "verification code")
# must NOT by itself make a conversation a lead or internal-staff chat. Internal
# Staff is only assigned from a verified roster match or an explicit manual
# override -- never from generic work vocabulary. See spec section 5.

# Strong intent phrases: a single match is sufficient evidence of lead intent.
LEAD_INTENT_PHRASES = (
    'admission', 'scholarship', 'study abroad', 'student visa', 'offer letter',
    'apply to', 'application fee', 'eligibility', 'consultation', 'visa guidance',
    'help me apply', 'want to apply', 'admission detail', 'fee structure',
    'study in', 'admission in', 'scholarship for',
)
# Weaker terms: ambiguous alone, so require at least TWO distinct ones together.
LEAD_TERMS = (
    'admission', 'scholarship', 'university', 'student visa', 'study abroad',
    'offer letter', 'cgpa', 'ielts', 'toefl', 'apply', 'application',
    'eligibility', 'visa', 'intake', 'semester fee', 'degree',
)

# Internal-staff / operational / query-routing conversations. These are the
# company's own groups and staff threads (named after the company, attendance /
# intern / counselor / audit groups, and "queries" routing groups). A chat whose
# TITLE matches one of these is internal staff, NOT a lead -- even if it was
# previously stored as potential_lead by the collector. Matched as whole words so
# "intern" never fires on "international". Extend as the org's group names grow.
INTERNAL_TITLE_MARKERS = (
    'scholarshiphive', 'scholarship hive', 'edutancy',
    'intern', 'attendance', 'roster', 'check-in', 'checkin',
    'counselor', 'counsellor', 'counselors', 'counsellors',
    'all office', 'office counselor', 'csr auditing', 'auditing',
    'staff', 'student issues', 'queries', 'query', 'team lead',
)
_INTERNAL_TITLE_RE = re.compile(
    r'\b(?:' + '|'.join(re.escape(m) for m in INTERNAL_TITLE_MARKERS) + r')\b', re.I)


def is_internal_conversation(title):
    """True when the conversation TITLE marks it as an internal staff / query /
    company group (never a customer lead). Title-only on purpose: 1:1 customer
    chats are titled with the contact's name and won't match these markers."""
    return bool(_INTERNAL_TITLE_RE.search(' '.join(str(title or '').split())))


def group_conversation_condition():
    """SQLAlchemy boolean, True when a Conversation is a WhatsApp GROUP, derived from
    already-stored data (no schema change / no re-sync -- works on old and new syncs):
      - a group JID (@g.us) appears in any message's source id, OR
      - there are >= 2 distinct CUSTOMER-side participant names (a group has multiple
        inbound senders; a 1:1 chat has exactly one contact).

    The inbound-participant count MUST mirror ``resolve_from_me`` (chat_overview):
    the stored ``from_me`` flag is unreliable (the extension's DOM scrape can flip
    direction), so a counselor's own reply is frequently saved as inbound -- under
    the counselor's own display name, or carrying an authoritative ``true_`` WhatsApp
    id. Counting those as a second "participant" is exactly what makes a 1:1 chat
    leak into the Groups tab, so they are excluded here with the same authority rules
    used everywhere else for display and audit.

    Used to split the Chats inbox (chats vs groups) and to keep groups OUT of the audit."""
    has_gjid = select(Message.id).where(
        Message.conversation_id == Conversation.id,
        Message.source_message_id.ilike('%@g.us%')).exists()

    # The counselor's display name comes from the owning User, joined directly into
    # the counting subquery below. A nested correlated scalar subquery for it works on
    # SQLite but raises a CardinalityViolation on PostgreSQL (its correlation is lost
    # two levels deep), so we join instead and correlate only the outer Conversation.
    owner = func.lower(func.trim(func.coalesce(User.full_name, '')))
    src = func.lower(func.coalesce(Message.source_message_id, ''))
    name = func.lower(func.trim(func.coalesce(Message.sender, '')))

    # Authoritative WhatsApp ids: ``true_...`` = counselor (out), ``false_...`` = customer (in).
    authoritative_out = src.startswith('true_')
    authoritative_in = src.startswith('false_')
    # The counselor's own message: exact display-name match, or -- when the account
    # name is 2+ words -- the account name as the LEADING part of the sender
    # (e.g. "Talha Ahmad Scholarshiphive"). Same rule as resolve_from_me.
    is_counselor = or_(name == owner,
                       and_(owner.like('% %'), name.like(owner.concat(' %'))))
    # A customer-side (inbound) message that reveals a distinct participant.
    inbound = and_(
        not_(authoritative_out),
        name != '',
        name.notin_(('you', 'me')),
        not_(is_counselor),
        or_(authoritative_in, Message.from_me.is_(False)),
    )
    distinct_inbound = (
        select(func.count(distinct(name)))
        .select_from(Message)
        .join(User, User.id == Conversation.employee_id, isouter=True)
        .where(Message.conversation_id == Conversation.id, inbound)
        .correlate(Conversation)
        .scalar_subquery())
    return or_(has_gjid, distinct_inbound >= 2)


def classify(text, needs_review=False, staff_verified=False, manual_category=None):
    """Return the business category ONLY: potential_lead / internal_staff /
    unclassified. Never returns needs_review -- that is an independent flag (see
    build_summary / the dashboard). ``needs_review`` is accepted for backward
    compatible call sites but no longer affects the business category, so a
    Potential Lead that also needs review is still a Potential Lead.

    Assignment order (spec 5.2): manual override > verified staff roster >
    contextual lead intent > unclassified.
    """
    if manual_category in ('potential_lead', 'internal_staff', 'unclassified'):
        return manual_category
    if staff_verified:
        return 'internal_staff'
    low = ' '.join(str(text or '').lower().split())
    if any(phrase in low for phrase in LEAD_INTENT_PHRASES):
        return 'potential_lead'
    if len({term for term in LEAD_TERMS if term in low}) >= 2:
        return 'potential_lead'
    return 'unclassified'

def duration_seconds(raw: str):
    value=str(raw or '').strip()
    if value.isdigit():return int(value)
    if re.fullmatch(r'\d{1,2}:\d{2}(?::\d{2})?',value):
        chunks=[int(x) for x in value.split(':')]
        return (chunks[0]*60+chunks[1]) if len(chunks)==2 else (chunks[0]*3600+chunks[1]*60+chunks[2])
    return 0

def _classification_aggregates(rows: list[dict]) -> dict:
    """All classification-dependent rollups, computed from the final canonical rows
    (contract 6 & 9.1 step 6). Shared by the deterministic path (build_summary) and
    the AI path (apply_ai_classification) so every consumer reads one source of truth.
    Independent facts (new-lead/NNR/response-time/voice/calls) are NOT recomputed here.
    """
    total=len(rows)
    counts=Counter(r['classification'] for r in rows)                       # compat view
    canon=Counter(r.get('canonical_category') for r in rows)                 # mutually exclusive
    tier_counts=Counter(r['lead_tier'] for r in rows if r.get('lead_tier'))
    status_counts=Counter(r.get('lead_status') for r in rows if r.get('lead_status'))
    responsive=canon.get('responsive',0)
    assessed=sum(tier_counts.get(k,0) for k,_ in am.TIER_THRESHOLDS)
    country=Counter();multi=0;unknown=0
    for r in rows:
        if r['classification']!='potential_lead':continue
        cs=r.get('countries') or []
        if not cs:unknown+=1;continue
        if len(cs)>1:multi+=1
        for c in cs:country[c]+=1
    agg={
        'potential_leads':counts['potential_lead'],'possible_internal':counts['internal_staff'],
        'unclassified':counts['unclassified'],
        'possible_no_reply':sum(r.get('possible_consultant_no_reply',0) for r in rows if r['classification']=='potential_lead'),
        'possible_dead':sum(r.get('possible_dead',0) for r in rows if r['classification']=='potential_lead'),
        'old_client_follow_up':sum(1 for r in rows if r.get('is_follow_up') and r['classification']=='potential_lead'),
        'lead_tiers':{k:tier_counts.get(k,0) for k,_ in am.TIER_THRESHOLDS},
        'responsive_tier_pending':max(0,responsive-assessed),
        'canonical_counts':{k:canon.get(k,0) for k in am.CANONICAL_CATEGORIES},
        'status_counts':{'closed':status_counts.get('closed',0),'rejected':status_counts.get('rejected',0),
                         'stalled':status_counts.get('stalled',0),'status_pending':status_counts.get('pending',0)},
        'closures':sum(1 for r in rows if r.get('canonical_category')=='responsive' and r.get('lead_status')=='closed'),
        'country_leads':dict(sorted(country.items())),'multi_country_leads':multi,'unknown_country_leads':unknown,
    }
    # Invariants (contract 6): compat classes cover every chat; canonical classes are
    # mutually exclusive and cover every chat; responsive = 4 tiers + tier-pending.
    agg['counts_reconciled']=(total==agg['potential_leads']+agg['possible_internal']+agg['unclassified'])
    agg['canonical_reconciled']=(total==sum(agg['canonical_counts'].values()))
    agg['responsive_reconciled']=(responsive==assessed+agg['responsive_tier_pending'])
    return agg


def build_summary(db: Session, employee_id: int, hours: int | None = None,
                  end: datetime | None = None, *, begin: datetime | None = None,
                  period_label: str | None = None):
    """Audit summary over an explicit reporting window, filtered at the MESSAGE
    timestamp level (DB requested-changes spec, 2026-11-17).

    The window is [begin, end). Rolling windows (Last 25h/7d/15d/30d) are passed
    as (begin, end) computed from the generation time; Previous Month / Custom are
    passed as explicit UTC bounds. Only messages whose occurred_at falls inside the
    window are analyzed -- a conversation that is merely recently active no longer
    drags in its older messages. There is NO silent all-time fallback: when a window
    is given and nothing is eligible, an explicit no-data summary is returned.
    Messages with missing/invalid timestamps are flagged (undated_excluded), never
    assigned an invented date or counted inside the period.
    """
    end = end or datetime.now(timezone.utc)
    if begin is None:
        begin = end - timedelta(hours=hours or 25)
    # Select EVERY conversation that has at least one message DATED in the window,
    # using the exact same message-level predicate as the Admin dashboard
    # (/admin/chats/summary) so the two always report the identical chat set. Reply
    # status is irrelevant here: a chat with an in-window message is included whether
    # or not the counselor replied -- "no reply" is reported as its own metric, never
    # by dropping the chat from the total. (The older last_seen/first_seen pre-filter
    # could diverge from message dates and silently drop chats.)
    # The audit is CHAT-only (18 Nov 2026 change): WhatsApp GROUPS are excluded from
    # the whole report (not counted, tiered, or registered). Everything else about the
    # per-chat logic is unchanged.
    conversations = db.scalars(select(Conversation).where(
        Conversation.employee_id==employee_id,
        not_(group_conversation_condition()),
        select(Message.id).where(
            Message.conversation_id==Conversation.id,
            Message.occurred_at>=begin, Message.occurred_at<end
        ).exists()
    ).options(selectinload(Conversation.messages)).order_by(Conversation.id)).all()
    rows=[]
    voice_sent=voice_received=voice_seconds=call_events=0
    undated_excluded=0
    analyzed_messages=0
    for chat in conversations:
        eligible=[]
        for m in chat.messages:
            dt=m.occurred_at
            if dt is None:
                undated_excluded+=1  # flagged for review; never given an invented date
                continue
            if dt.tzinfo is None:
                dt=dt.replace(tzinfo=timezone.utc)
            if begin <= dt < end:
                eligible.append((dt,m))
        if not eligible:
            continue
        eligible.sort(key=lambda pair:(pair[0], pair[1].id))
        msgs=[m for _,m in eligible]
        analyzed_messages+=len(msgs)
        content=' '.join(str(m.text or '') for m in msgs)
        # Business category uses the conversation's STORED, full-history category
        # (spec 5.2: a lead is retained from the whole history and must not be erased
        # just because the lead-intent message falls outside the selected window).
        # Fall back to window-text classification only if no stored state exists.
        kind = (chat.state or classify(content))
        if kind not in ('potential_lead','internal_staff','unclassified'):
            kind = classify(content)  # normalise any legacy/retired state value
        # Internal staff / query / company-group chats are NOT leads, even if the
        # collector stored them as potential_lead. A title-based override keeps them
        # out of the lead & tier pipeline (so "appear internal" is correct and
        # groups like "Queries Italy" / "Attendance ... intern" stop showing as Hot).
        _title_for_kind = chat.display_name_override or chat.title
        if is_internal_conversation(_title_for_kind):
            kind = 'internal_staff'
        # Per-conversation media tallies so every audit card can drill down to the
        # exact conversations that produced its number (spec 2.1 drill-down). These
        # are additive fields; the window/global totals below are unchanged.
        c_voice_sent=c_voice_received=c_voice_seconds=c_call_events=0
        for msg in msgs:
            media=str(msg.media or '').lower()
            if 'voice' in media or 'audio' in media:
                if msg.from_me:voice_sent+=1;c_voice_sent+=1
                else:voice_received+=1;c_voice_received+=1
                secs=duration_seconds(msg.media_duration);voice_seconds+=secs;c_voice_seconds+=secs
            if 'call' in media:call_events+=1;c_call_events+=1
        has_inbound=any(not m.from_me for m in msgs)
        has_outbound=any(m.from_me for m in msgs)
        no_reply=bool(msgs and not msgs[-1].from_me)
        dead=bool(msgs and has_outbound and not has_inbound)
        # --- Management-analytics derivations (spec 18 Nov 2026) -------------
        # Normalize the window messages and the full history UP TO the window end
        # (as-of-end state) so event-time metrics are correct and reproducible.
        def _norm(m):
            dt=m.occurred_at
            if dt.tzinfo is None:dt=dt.replace(tzinfo=timezone.utc)
            return {'dt':dt,'from_me':bool(m.from_me),'text':str(m.text or ''),
                    'media':str(m.media or '').lower(),'dur':duration_seconds(m.media_duration)}
        window_norm=[_norm(m) for m in msgs]
        hist=[]
        for m in chat.messages:
            dt=m.occurred_at
            if dt is None:continue
            if dt.tzinfo is None:dt=dt.replace(tzinfo=timezone.utc)
            if dt<end:hist.append(_norm(m))
        hist.sort(key=lambda x:x['dt'])
        full_text=' '.join(x['text'] for x in hist) or content
        rstate=am.reply_state(hist)
        nl=am.new_lead_facts(hist,begin,end,kind)
        # Canonical conversation class (contract 4.2), mutually exclusive. A chat
        # flagged needs_review is that class regardless of direction, so the
        # selected-total equation (contract 6) reconciles exactly.
        canonical=('needs_review' if chat.needs_review
                   else am.canonical_category(kind,has_inbound,has_outbound))
        # Tier only for RESPONSIVE + explicit CGPA (no point model, no 5th tier).
        tier=am.lead_tier(hist,full_text,canonical,end)
        tier_assess=am.tier_assessment(canonical,tier)
        lead_status,status_reason=am.deterministic_status(hist,canonical)
        countries,primary_country=am.extract_countries(full_text)
        calls=am.call_breakdown(window_norm,nl['is_new_lead'])
        is_follow_up=(not nl['is_new_lead']) and has_outbound and bool(hist) and (hist[0]['dt']<begin)
        follow_up_touches=sum(1 for m in window_norm if m['from_me']) if is_follow_up else 0
        # Exclude echo duplicates so a mirrored message never fabricates a reply
        # pair (keeps the pooled average faithful to the response-time criteria).
        pair_secs=am.response_pairs(am.drop_echoes(window_norm))
        row={'id':chat.id,'title':chat.display_name_override or chat.title,'messages':len(msgs),'classification':kind,'needs_review':chat.needs_review,'review_reason':chat.review_reason,'possible_consultant_no_reply':no_reply,'possible_dead':dead,
             'voice_sent':c_voice_sent,'voice_received':c_voice_received,'voice_seconds':c_voice_seconds,'call_events':c_call_events,
             'reply_state':rstate,'is_new_lead':nl['is_new_lead'],'is_follow_up':is_follow_up,
             'new_lead_responded':nl['responded'],'new_lead_awaiting_counselor':nl['new_lead_awaiting_counselor'],
             'nnr_awaiting_customer':nl['nnr_awaiting_customer'],'first_response_seconds':nl['first_response_seconds'],
             'lead_tier':tier,'tier_assessment':tier_assess,
             'canonical_category':canonical,'lead_status':lead_status,'status_reason':status_reason,
             'countries':countries,'primary_country':primary_country,
             'calls_inbound':calls['inbound'],'calls_outbound':calls['outbound'],
             'new_lead_calls':calls['new_lead'],'follow_up_calls':calls['follow_up'],
             'follow_up_touches':follow_up_touches,'response_pairs':len(pair_secs)}
        row['_pair_secs']=pair_secs  # internal, stripped before storage
        rows.append(row)
    counts=Counter(r['classification'] for r in rows)
    total=len(rows)
    # Three independent dimensions (spec 2): business category, reply status, and
    # needs_review. needs_review is counted as its own flag, NOT as a category,
    # so a Potential Lead that also needs review still counts as a lead.
    needs_review_total=sum(1 for r in rows if r['needs_review'])
    window_hours = hours if hours is not None else max(1, round((end-begin).total_seconds()/3600))
    # --- Management-analytics aggregates (spec 18 Nov 2026) -----------------
    new_leads=[r for r in rows if r['is_new_lead']]
    new_lead_responded=sum(1 for r in new_leads if r['new_lead_responded'])
    new_lead_awaiting_counselor=sum(1 for r in new_leads if r['new_lead_awaiting_counselor'])
    nnr_awaiting_customer=sum(1 for r in new_leads if r['nnr_awaiting_customer'])
    follow_up_conversations=sum(1 for r in rows if r['is_follow_up'])
    follow_up_touches=sum(r['follow_up_touches'] for r in rows)
    # Old follow-ups that are currently awaiting a counselor reply — flagged
    # SEPARATELY from the new-lead NNR number (spec 5.2).
    old_followup_awaiting=sum(1 for r in rows if r['is_follow_up'] and r['reply_state']=='awaiting_counselor_reply')
    # Overall (new + follow-up) no-response split by who owes the next reply:
    #   NR from counsellor -> customer wrote last, counsellor has not replied (awaiting_counselor_reply)
    #   NR from lead       -> counsellor replied last, the lead/customer has gone silent (replied)
    nr_from_counsellor=sum(1 for r in rows if r['reply_state']=='awaiting_counselor_reply')
    nr_from_lead=sum(1 for r in rows if r['reply_state']=='replied')
    # Old clients the counsellor followed up: follow-up chats classified as Clients.
    old_client_follow_up=sum(1 for r in rows if r['is_follow_up'] and r['classification']=='potential_lead')
    first_resp_samples=[r['first_response_seconds'] for r in new_leads if r['first_response_seconds'] is not None]
    avg_new_lead_first_response=round(sum(first_resp_samples)/len(first_resp_samples)) if first_resp_samples else None
    all_pairs=[s for r in rows for s in r['_pair_secs']]
    # Median is the headline response time (robust to overnight / multi-day waits);
    # the pooled mean and p90 are retained as context. Same first-inbound->first-reply
    # pairs, echoes already excluded.
    _sorted_pairs=sorted(all_pairs)
    avg_overall_response=round(sum(all_pairs)/len(all_pairs)) if all_pairs else None
    median_overall_response=round(statistics.median(all_pairs)) if all_pairs else None
    p90_overall_response=(round(_sorted_pairs[min(len(_sorted_pairs)-1,int(round(0.9*(len(_sorted_pairs)-1))))])
                          if all_pairs else None)
    reply_state_counts=Counter(r['reply_state'] for r in rows)
    tier_counts=Counter(r['lead_tier'] for r in rows if r['lead_tier'])
    # Country pipeline: distinct leads per country among Potential Leads; a lead
    # considering several countries is counted once per country for the per-country
    # view but ONCE in the distinct global total (spec 3.2, A15).
    country_leads=Counter()
    multi_country_leads=0;unknown_country_leads=0
    for r in rows:
        if r['classification']!='potential_lead':continue
        if not r['countries']:unknown_country_leads+=1;continue
        if len(r['countries'])>1:multi_country_leads+=1
        for cname in r['countries']:country_leads[cname]+=1
    calls_inbound=sum(r['calls_inbound'] for r in rows)
    calls_outbound=sum(r['calls_outbound'] for r in rows)
    new_lead_calls=sum(r['new_lead_calls'] for r in rows)
    follow_up_calls=sum(r['follow_up_calls'] for r in rows)
    responded_text_voice=sum(1 for r in rows if r['reply_state']=='replied')
    # All-channel view (spec 7.2): adds conversations whose only counselor touch in
    # the window was an OUTBOUND call. We cannot verify "answered", so an outbound
    # call counts as a counselor touch here but NOT in the per-channel text/voice
    # number above; both are reported so neither is silently merged.
    responded_all_channel=sum(1 for r in rows if r['reply_state']=='replied' or r['calls_outbound']>0)
    for r in rows:r.pop('_pair_secs',None)  # strip internal field before storage
    summary={
        'employee_id':employee_id,'hours':window_hours,'total_chats':total,
        'period_label':period_label or f'Last {window_hours} hours',
        'period_start':begin.isoformat(),'period_end':end.isoformat(),
        'eligible_chats':total,'analyzed_messages':analyzed_messages,
        'undated_excluded':undated_excluded,
        'potential_leads':counts['potential_lead'],'possible_internal':counts['internal_staff'],
        'unclassified':counts['unclassified'],'needs_review':needs_review_total,
        'currently_awaiting_reply':sum(1 for r in rows if r['possible_consultant_no_reply']),
        'possible_no_reply':sum(r['possible_consultant_no_reply'] for r in rows if r['classification']=='potential_lead'),
        'possible_dead':sum(r['possible_dead'] for r in rows if r['classification']=='potential_lead'),
        'voice_notes_sent':voice_sent,'voice_notes_received':voice_received,'known_voice_duration_seconds':voice_seconds,'call_placeholders':call_events,
        # --- Management-analytics summary (spec 18 Nov 2026; deterministic) ---
        'new_leads':len(new_leads),'new_lead_responded':new_lead_responded,
        'new_lead_awaiting_counselor':new_lead_awaiting_counselor,'nnr_awaiting_customer':nnr_awaiting_customer,
        'nr_from_counsellor':nr_from_counsellor,'nr_from_lead':nr_from_lead,
        'follow_up_conversations':follow_up_conversations,'follow_up_touches':follow_up_touches,
        'old_followup_awaiting':old_followup_awaiting,'old_client_follow_up':old_client_follow_up,
        'avg_new_lead_first_response_seconds':avg_new_lead_first_response,
        'new_lead_first_response_samples':len(first_resp_samples),
        'new_lead_first_response_missing':len(new_leads)-len(first_resp_samples),
        'avg_overall_response_seconds':avg_overall_response,'overall_response_samples':len(all_pairs),
        'median_overall_response_seconds':median_overall_response,'p90_overall_response_seconds':p90_overall_response,
        'reply_states':dict(reply_state_counts),
        'lead_tiers':{k:tier_counts.get(k,0) for k,_ in am.TIER_THRESHOLDS},
        'country_leads':dict(sorted(country_leads.items())),'multi_country_leads':multi_country_leads,
        'unknown_country_leads':unknown_country_leads,
        'calls_inbound':calls_inbound,'calls_outbound':calls_outbound,
        'new_lead_calls':new_lead_calls,'follow_up_calls':follow_up_calls,
        'responded_text_voice':responded_text_voice,'responded_all_channel':responded_all_channel,
        'unread_excluded':0,'coverage_note':'Conversations are based on synchronized, available WhatsApp Web data. Unread chats can be excluded by the collector.',
        'quality_notes':[], 'conversations':rows,
        'qa_dimensions':{key:'Not assessed: requires validated relevant lead evidence' for key in ['greeting','first_response_time','needs_discovery','product_knowledge','objection_handling','upselling','closing','follow_up','professional_tone','sop_compliance']}
    }
    log=db.scalars(select(SyncLog).where(SyncLog.employee_id==employee_id,SyncLog.created_at<=end).order_by(SyncLog.id.desc()).limit(1)).first()
    if log:
        summary['unread_excluded']=log.unread_excluded
        summary['last_sync_at']=log.created_at.isoformat()
    if not total: summary['quality_notes'].append(f"No eligible messages found in the selected period ({summary['period_label']}). This is a no-data result, NOT an all-time report.")
    if undated_excluded: summary['quality_notes'].append(f"{undated_excluded} message(s) with missing/invalid timestamps were flagged and excluded from the period rather than assigned an invented date.")
    if summary['needs_review']: summary['quality_notes'].append(f"{summary['needs_review']} conversations require manual review; media/call contents were not invented.")
    if summary['call_placeholders']:summary['quality_notes'].append('Call events are placeholders; actual call duration/recording is not inferred.')
    if summary['unread_excluded']: summary['quality_notes'].append(f"{summary['unread_excluded']} unread conversations were excluded by collector in most recent sync.")
    if any(r['classification']=='unclassified' for r in rows): summary['quality_notes'].append('Unknown conversations were not automatically penalized as poor-quality leads.')
    # Reconcile ONLY the business-category dimension (the three are mutually
    # exclusive and cover every chat). needs_review is a separate flag and must
    # NOT be summed into this total (spec 2 INTERPRETATION RULE).
    # Canonical classification/tier/status/closure rollups + invariants (single
    # source of truth). Overrides the compat keys computed inline above with the
    # same values and adds the canonical ones; management/response-time metrics above
    # are independent and untouched.
    summary.update(_classification_aggregates(rows))
    return summary


# AI audit categories -> the three business categories that drive the headline
# counts. A lead that inquired, a dead cold-contact, and a replied prospect are all
# Clients; only clear staff/admin threads are Internal; empty/unclear stay Unclassified.
_AI_CATEGORY_TO_BUSINESS = {
    'responsive': 'potential_lead',
    'consultant_no_reply': 'potential_lead',
    'dead': 'potential_lead',
    'internal_staff': 'internal_staff',
    'empty': 'unclassified',
    'unclassified': 'unclassified',
}
_AI_TIERS = ('very_hot', 'hot', 'average', 'cold')


def apply_ai_classification(summary: dict) -> dict:
    """Make the AI's per-chat category + lead tier authoritative (old n8n/Gemini
    approach). Only rows the AI actually evaluated are overridden; chats where AI was
    unavailable keep their deterministic classification/tier (safe fallback). All
    classification-derived headline counts are recomputed from the overridden rows.
    Call this AFTER evaluate_conversations has populated audit_category/audit_tier."""
    rows = summary.get('conversations') or []
    overridden = 0
    for r in rows:
        if r.get('audit_analysis_status') != 'evaluated':
            continue  # AI did not evaluate this chat -> keep deterministic result
        business = _AI_CATEGORY_TO_BUSINESS.get(r.get('audit_category'))
        if not business:
            continue
        r['classification'] = business
        # Canonical class from the AI judge; its 'unclassified' maps to the
        # mutually-exclusive needs_review bucket (contract 4.2 / 6).
        ai_canon = r.get('audit_category')
        r['canonical_category'] = 'needs_review' if ai_canon in (None, 'unclassified') else ai_canon
        # AI only tiers responsive leads; a responsive lead with no AI tier is
        # tier-pending, a non-responsive chat has no tier.
        r['lead_tier'] = r.get('audit_tier') if (r['canonical_category'] == 'responsive' and r.get('audit_tier') in _AI_TIERS) else None
        r['tier_assessment'] = am.tier_assessment(r['canonical_category'], r['lead_tier'])
        r['lead_status'] = r.get('audit_status') if r['canonical_category'] == 'responsive' else None
        r['status_reason'] = r.get('audit_status_reason', '') if r['lead_status'] else ''
        overridden += 1
    if not overridden:
        return summary
    # Recompute every classification-dependent rollup from the overridden rows
    # (single source of truth) and record the provenance.
    summary.update(_classification_aggregates(rows))
    summary['classification_source'] = 'ai'
    return summary
