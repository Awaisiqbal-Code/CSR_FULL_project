"""Evidence-only statistics for the Admin Conversations overview.

No AI lead guesses, no inferred call times, and no WhatsApp unread-message content.
"""
from collections import Counter, defaultdict
from datetime import timezone
import re
import statistics
from zoneinfo import ZoneInfo


def _percentile(sorted_vals, pct):
    """Nearest-rank percentile of an already-sorted list (None if empty)."""
    if not sorted_vals:
        return None
    k = min(len(sorted_vals) - 1, int(round((pct / 100.0) * (len(sorted_vals) - 1))))
    return sorted_vals[k]

PKT = ZoneInfo('Asia/Karachi')


def normalized_kind(media):
    return str(media or '').strip().lower()


def call_duration_seconds(value):
    """Parse durations only when the source contains an unambiguous duration."""
    raw = str(value or '').strip().lower()
    if not raw:
        return None
    if re.fullmatch(r'\d{1,2}:\d{2}(?::\d{2})?', raw):
        parts = [int(x) for x in raw.split(':')]
        if parts[-1] >= 60 or (len(parts) == 3 and parts[-2] >= 60):
            return None
        return parts[0] * 60 + parts[1] if len(parts) == 2 else parts[0] * 3600 + parts[1] * 60 + parts[2]
    if re.fullmatch(r'\d+\s*s(?:ec(?:ond)?s?)?', raw):
        return int(re.match(r'\d+', raw).group())
    match = re.fullmatch(r'(\d+)\s*m(?:in(?:ute)?s?)?\s*(?:(\d+)\s*s(?:ec(?:ond)?s?)?)?', raw)
    if match:
        return int(match[1]) * 60 + int(match[2] or 0)
    return None


def resolve_from_me(stored, sender='', source_id='', contact_title='', employee_name=''):
    """Use authoritative WA true_/false_ source key, then explicit "You".

    A missing ID must not be used to guess participant orientation from the
    chat title or group sender. Fall back to the original stored direction.
    """
    source = str(source_id or '').strip()
    hit = re.match(r'^(true|false)_[^\s]+', source, re.I)
    if hit:
        return hit.group(1).lower() == 'true'
    actor=str(sender or '').strip().casefold()
    if actor in ('you', 'me'):
        return True
    # WhatsApp often shows the logged-in counselor's display name rather than
    # literal 'You'. Exact name equality is a narrow fallback for ID-less rows;
    # never override a true_/false_ WhatsApp ID and never confuse a matching
    # customer contact name with the counselor. This is inferred evidence.
    owner = ' '.join(str(employee_name or '').split()).casefold()
    contact = ' '.join(str(contact_title or '').split()).casefold()
    if owner and actor and actor != contact:
        owner_tokens = owner.split()
        actor_tokens = actor.split()
        # The counselor's WhatsApp display name is frequently the extension-account
        # name plus extra branding words (e.g. "Talha Ahmad Scholarshiphive
        # Edutancy" for the account "Talha Ahmad"). Treat an exact match, or the
        # full (2+ token) account name appearing as the LEADING part of the
        # sender, as the counselor -> outgoing. Never matches the saved contact,
        # and never overrides an authoritative true_/false_ WhatsApp ID above.
        if actor == owner:
            return True
        if len(owner_tokens) >= 2 and actor_tokens[:len(owner_tokens)] == owner_tokens:
            return True
    # Legacy source without a stable ID: a sender explicitly equal to the
    # saved 1:1 contact title contradicts an outbound flag. A group title
    # normally differs from participants, so never guess beyond this.
    if stored and actor and contact_title and actor == str(contact_title).strip().casefold():
        return False
    return bool(stored)


def collapse_echoes(rows, *, window_seconds=90, min_len=12):
    """Remove WhatsApp-Web ECHO duplicates for DISPLAY only (stored data untouched).

    WhatsApp Web sometimes re-emits a message a few seconds later under the OPPOSITE
    direction, so the counselor's own text reappears inside the customer's bubble.
    Collapse such a pair: keep the copy carrying an authoritative true_/false_ WhatsApp
    id (else the earlier copy) and drop the mirrored echo.

    rows: list of dicts with keys id, text, from_me (bool), dt (aware/naive datetime or
    None), source_id (str). Returns the kept rows in the original order. Short
    acknowledgements (< min_len chars) are never collapsed, so a genuine repeated
    "ok"/"yes" is preserved. Exact text match + opposite direction + close time only.
    """
    def _secs(a, b):
        try:
            return abs((a - b).total_seconds())
        except (TypeError, ValueError):
            return None
    norm = [' '.join(str(r.get('text') or '').split()) for r in rows]
    auth = [bool(re.match(r'^(?:true|false)_', str(r.get('source_id') or ''), re.I)) for r in rows]
    drop = set()
    n = len(rows)
    for i in range(n):
        if rows[i]['id'] in drop:
            continue
        ta = rows[i].get('dt')
        if ta is None or len(norm[i]) < min_len:
            continue
        for j in range(i + 1, n):
            if rows[j]['id'] in drop:
                continue
            tb = rows[j].get('dt')
            if tb is None:
                continue
            gap = _secs(ta, tb)
            if gap is None:
                continue
            if gap > window_seconds:
                if tb is not None and ta is not None and tb >= ta:
                    break  # rows are time-ordered: nothing closer remains
                continue
            if norm[j] != norm[i] or bool(rows[i]['from_me']) == bool(rows[j]['from_me']):
                continue
            # Keep the authoritative copy; otherwise keep the earlier (i) and drop j.
            if auth[j] and not auth[i]:
                drop.add(rows[i]['id'])
                break
            drop.add(rows[j]['id'])
    return [r for r in rows if r['id'] not in drop]


def safe_utc(value):
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def analyze_message_rows(rows, conversation_ids, *, begin=None, stop=None, include_chat_ids=False):
    """rows: ordered (id, conversation_id, from_me, occurred_at, media, duration).

    Filters to event times in [begin, stop) when supplied. Undated rows remain
    counted as unavailable source dates but are never assigned to a month.
    """
    bounds = begin is not None
    states = {int(cid): {'incoming':0,'outgoing':0,'invalid':False,'pairs':0,'pending':None,'pending_final':False} for cid in conversation_ids}
    totals = Counter()
    by_day = Counter()
    calls = []
    response_durations = []
    call_seconds = 0
    timed_calls = 0
    for row in rows:
        mid,cid,from_me,occurred,media,duration = row
        if cid not in states:
            continue
        kind = normalized_kind(media)
        dt = safe_utc(occurred)
        if bounds and dt is not None and not (begin <= dt < stop):
            continue
        # Undated rows cannot be reliably included in a selected event-time range.
        if bounds and dt is None:
            totals['unknown_event_date_in_cohort'] += 1
            continue
        if kind == 'call':
            totals['call_events'] += 1
            duration_s = call_duration_seconds(duration)
            if duration_s is not None:
                timed_calls += 1
                call_seconds += duration_s
            if dt is None:
                totals['calls_without_date'] += 1
            calls.append({'id':mid,'conversation_id':cid,'occurred_at':dt.isoformat() if dt else None,
                          'duration_seconds':duration_s})
            continue
        totals['messages'] += 1
        if dt is None:
            totals['undated_messages'] += 1
        else:
            by_day[dt.astimezone(PKT).date().isoformat()] += 1
        if kind in ('voice','audio'):
            totals['voice_notes'] += 1
        if kind in ('image','video','document'):
            totals['media_placeholders'] += 1
        state = states[cid]
        if from_me:
            totals['counselor_messages'] += 1
            state['outgoing'] += 1
        else:
            totals['incoming_messages'] += 1
            state['incoming'] += 1
        if dt is None:
            state['invalid'] = True
            continue
        if from_me:
            if state['pending'] is not None and dt >= state['pending']:
                response_durations.append((dt - state['pending']).total_seconds())
                state['pairs'] += 1
                totals['response_pairs'] += 1
                state['pending'] = None
        elif state['pending'] is None:
            state['pending'] = dt

    response_ids = {'replied':[], 'no_reply':[], 'unverifiable':[]}
    for cid,state in states.items():
        if state['incoming'] == 0 or state['invalid']:
            totals['response_unverifiable_chats'] += 1
            response_ids['unverifiable'].append(cid)
        elif state['pairs']:
            response_ids['replied'].append(cid)
            totals['responded_chats'] += 1
            if state['pending'] is not None:
                totals['chats_with_pending_reply'] += 1
        else:
            totals['no_reply_observed_chats'] += 1
            response_ids['no_reply'].append(cid)

    calls.sort(key=lambda c:(c['occurred_at'] or '', c['id']), reverse=True)
    result = {
        'messages': totals['messages'], 'incoming_messages': totals['incoming_messages'],
        'counselor_messages': totals['counselor_messages'], 'voice_notes':totals['voice_notes'],
        'media_placeholders':totals['media_placeholders'],
        'undated_messages':totals['undated_messages'],
        'call_events':totals['call_events'], 'calls_without_date':totals['calls_without_date'],
        'calls_with_duration':timed_calls,'known_call_duration_seconds':call_seconds,
        'response_pairs':totals['response_pairs'],
        # Median is the headline (robust to overnight / multi-day waits); the pooled
        # mean and p90 are kept as context. All from the same first-inbound ->
        # first-reply pairs (consecutive/ trailing bursts already collapsed above).
        'median_response_seconds': round(statistics.median(response_durations)) if response_durations else None,
        'avg_response_seconds': round(sum(response_durations) / len(response_durations)) if response_durations else None,
        'p90_response_seconds': round(_percentile(sorted(response_durations), 90)) if response_durations else None,
        'responded_chats':totals['responded_chats'],
        'no_reply_observed_chats':totals['no_reply_observed_chats'],
        'response_unverifiable_chats':totals['response_unverifiable_chats'],
        'chats_with_pending_reply':totals['chats_with_pending_reply'],
        # Spec 4: "Currently Awaiting Reply" -- the latest actionable customer turn
        # has no later valid counselor response. This is a CURRENT-state metric and
        # intentionally overlaps "No Reply Observed" (never replied) plus chats that
        # were replied earlier but whose newest turn is still open. It is a separate
        # dimension from "Chats Replied (period)" and must not be summed with it.
        'currently_awaiting_reply':totals['no_reply_observed_chats']+totals['chats_with_pending_reply'],
        'unknown_event_date_in_cohort':totals['unknown_event_date_in_cohort'],
        'daily_activity':[{'date':key, 'messages':value} for key,value in sorted(by_day.items())],
        'recent_calls':calls[:6],
    }
    if include_chat_ids:
        result['response_chat_ids'] = response_ids
    return result
