"""Deterministic management-audit metrics (Audit & Management Analytics spec,
18 Nov 2026). Pure, event-time functions over normalized message lists so every
number is reproducible and testable without a database or AI.

All thresholds that the source spec did not fix are gathered here as named
constants and documented in AUDIT_METRICS_CRITERIA_2026-11-18.md. Counts and
durations are deterministic; AI (when configured) only adds narrative/nuance and
never changes these numbers. Nothing here mutates stored data.

A "normalized message" is a dict: {dt: aware datetime, from_me: bool, text: str,
media: str(lowercased), dur: int seconds}. Callers pass only dated messages.
"""
from __future__ import annotations
from datetime import timedelta
import re

# ---------------------------------------------------------------------------
# CRITERIA CONSTANTS (chosen where the spec left thresholds open; see the
# criteria file). Change here to re-tune; every metric reads from these.
# ---------------------------------------------------------------------------

# A new lead whose counselor answered but the customer then went silent becomes
# "NNR - Awaiting Customer Response" only after this grace period (spec 5.2 calls
# it "a configurable cutoff"). Chosen default: 24h.
NNR_CUSTOMER_SILENCE_HOURS = 24

# "Recent" engagement for lead-tier scoring: last activity within this many days
# of the window end earns the recency point.
TIER_RECENT_DAYS = 3

# Legacy n8n methodology (Final Master Implementation Contract v2, 25 Nov 2026):
# there are EXACTLY FOUR tiers and NO fifth "Close to Conversion" tier. Tiers apply
# only to RESPONSIVE leads, and only from an explicit CGPA (or, via the AI judge,
# clear qualification evidence) — there is NO engagement-point scoring. A responsive
# lead with no qualification evidence is tier-pending, never an invented tier.
# The list is the canonical enum/order; the numbers are retained only so legacy
# callers that iterate ``for k,_ in TIER_THRESHOLDS`` keep working.
TIER_THRESHOLDS = [
    ('very_hot', 4),
    ('hot', 3),
    ('average', 2),
    ('cold', 1),
]
TIERS = tuple(name for name, _ in TIER_THRESHOLDS)

# Canonical conversation classes (contract 4.2). Mutually exclusive; ambiguous /
# unclassifiable chats fall into ``needs_review`` so the selected-total equation
# (contract 6) reconciles exactly.
CANONICAL_CATEGORIES = ('responsive', 'dead', 'consultant_no_reply',
                        'internal_staff', 'empty', 'needs_review')

# Explicit counselor-side evidence markers for deterministic closure / rejection
# (shared with the AI validator in audit_intelligence._validate_one). A status is
# only CLOSED/REJECTED when the counselor's OWN words carry one of these; a promise
# ("I will transfer you") or customer enthusiasm is never sufficient.
HANDOVER_MARKERS = ('transferred', 'transferred you', 'handed over', 'handoff completed',
                    'assigned to', 'connected you with', 'referred you', 'connect kar diya',
                    'assign kar diya', 'handover kar diya')
REJECTION_MARKERS = ('not eligible', 'ineligible', 'cannot apply', 'not qualified',
                     'does not qualify', 'rejected', 'not meet the requirements',
                     'eligible nahi', 'apply nahi kar sakte')

# Original n8n CGPA tier guidelines (from WCE_3 Gemini prompt). When a CGPA is
# explicitly stated these bands are AUTHORITATIVE and are the ONLY deterministic
# tier basis (contract v2). Absent a CGPA the deterministic tier is None (pending);
# the AI judge may still tier from broader qualification evidence.
# (lower-bound, tier) on a standard 4.0 scale.
CGPA_TIER_BANDS = [
    (3.7, 'very_hot'),
    (3.1, 'hot'),
    (2.6, 'average'),
    (0.0, 'cold'),
]
# Match an explicit CGPA/GPA value in natural phrasing, e.g. "cgpa 3.2",
# "gpa: 3.5", "my cgpa is 3.4", "3.4 cgpa", "3.4/4". A short filler gap (":", "is",
# "=") is allowed between the label and the number; a long gap is not, so an
# unrelated later number is never captured.
_CGPA_LABELLED = re.compile(r'\b(?:cgpa|gpa)\b[^\d\n]{0,8}([0-4](?:\.\d{1,2})?)\b', re.I)
_CGPA_SUFFIX = re.compile(r'\b([0-4](?:\.\d{1,2})?)\s*(?:cgpa|gpa)\b', re.I)
_CGPA_SCALE = re.compile(r'\b([0-4](?:\.\d{1,2})?)\s*/\s*4(?:\.0)?\b')

# Strong intent phrases (single match = strong lead evidence). Mirrors analysis.py
# LEAD_INTENT_PHRASES so classification and tiering stay consistent.
STRONG_INTENT = (
    'admission', 'scholarship', 'study abroad', 'student visa', 'offer letter',
    'apply to', 'application fee', 'eligibility', 'consultation', 'visa guidance',
    'help me apply', 'want to apply', 'admission detail', 'fee structure',
    'study in', 'admission in', 'scholarship for',
)
GENERIC_LEAD_TERMS = (
    'admission', 'scholarship', 'university', 'student visa', 'study abroad',
    'offer letter', 'cgpa', 'ielts', 'toefl', 'apply', 'application',
    'eligibility', 'visa', 'intake', 'semester fee', 'degree',
)

# Study-destination detection. Each country maps to word-boundary regex altern;
# evidence-only, never guessed from name/language/counselor (spec 3.2). Extend as
# the business criteria sheet grows.
_COUNTRY_SOURCES = {
    'United Kingdom': ['uk', 'u\\.k', 'united kingdom', 'britain', 'england', 'scotland', 'wales'],
    'United States': ['usa', 'u\\.s\\.a', 'united states', 'america'],
    'Canada': ['canada', 'canadian'],
    'Australia': ['australia', 'australian'],
    'Germany': ['germany', 'german', 'deutschland'],
    'Italy': ['italy', 'italian'],
    'France': ['france', 'french'],
    'Ireland': ['ireland', 'irish'],
    'New Zealand': ['new zealand'],
    'Netherlands': ['netherlands', 'holland', 'dutch'],
    'Sweden': ['sweden', 'swedish'],
    'Finland': ['finland', 'finnish'],
    'Denmark': ['denmark', 'danish'],
    'Spain': ['spain', 'spanish'],
    'Poland': ['poland', 'polish'],
    'Hungary': ['hungary', 'hungarian'],
    'Austria': ['austria', 'austrian'],
    'Turkey': ['turkey', 'turkiye', 'turkish'],
    'Cyprus': ['cyprus'],
    'Malaysia': ['malaysia', 'malaysian'],
    'China': ['china', 'chinese'],
    'UAE': ['uae', 'u\\.a\\.e', 'dubai', 'abu dhabi', 'emirates'],
    'Qatar': ['qatar'],
}
_COUNTRY_PATTERNS = [
    (name, re.compile(r'\b(?:%s)\b' % '|'.join(alts), re.IGNORECASE))
    for name, alts in _COUNTRY_SOURCES.items()
]


def extract_countries(text: str):
    """Return (sorted distinct countries found, primary or None). Primary is the
    single most-mentioned country only when one leads strictly (explicit
    preference); ties => no primary, exposed as multi-country. Unknown => ([], None)."""
    low = str(text or '')
    counts = {}
    for name, pat in _COUNTRY_PATTERNS:
        n = len(pat.findall(low))
        if n:
            counts[name] = n
    if not counts:
        return [], None
    names = sorted(counts)
    top = max(counts.values())
    leaders = [k for k, v in counts.items() if v == top]
    primary = leaders[0] if len(leaders) == 1 else None
    return names, primary


def reply_state(hist):
    """Current reply state from the latest actionable customer turn (spec 3.1).
    Replied / Awaiting Counselor Reply / No Reply Observed / No Action Required /
    Unknown. `hist` = dated messages up to window end, ascending."""
    if not hist:
        return 'unknown'
    inbound = [m for m in hist if not m['from_me']]
    outbound = [m for m in hist if m['from_me']]
    if not inbound:
        return 'no_action_required'  # counselor-only / system thread, no customer ask
    last_in = inbound[-1]['dt']
    if any(m['dt'] > last_in for m in outbound):
        return 'replied'
    return 'awaiting_counselor_reply' if outbound else 'no_reply_observed'


def drop_echoes(norm_msgs, *, window_seconds=90, min_len=12):
    """Remove WhatsApp-Web echo duplicates from a normalized, ascending message list
    so response timing is not skewed by a mirrored message (same text re-emitted a
    few seconds later under the OPPOSITE direction -> a false reply). Keep the earlier
    copy, drop the later echo. Short texts (< min_len) are never treated as echoes, so
    genuine repeated acknowledgements are preserved. Input: dicts with dt, from_me,
    text (sorted by dt)."""
    texts = [' '.join(str(m.get('text') or '').split()) for m in norm_msgs]
    drop = set()
    n = len(norm_msgs)
    for i in range(n):
        if i in drop or len(texts[i]) < min_len:
            continue
        for j in range(i + 1, n):
            if j in drop:
                continue
            try:
                gap = (norm_msgs[j]['dt'] - norm_msgs[i]['dt']).total_seconds()
            except (TypeError, ValueError):
                continue
            if gap > window_seconds:
                break
            if texts[j] == texts[i] and bool(norm_msgs[j]['from_me']) != bool(norm_msgs[i]['from_me']):
                drop.add(j)
    return [m for k, m in enumerate(norm_msgs) if k not in drop]


def response_pairs(window_msgs):
    """Completed customer->counselor turn pairs inside the window (spec 4.1).
    Consecutive incoming messages collapse into ONE turn; the first following
    outgoing closes it. Returns a list of response durations in seconds."""
    pairs = []
    pending = None
    for m in window_msgs:
        if not m['from_me']:
            if pending is None:
                pending = m['dt']
        elif pending is not None:
            pairs.append((m['dt'] - pending).total_seconds())
            pending = None
    return [s for s in pairs if s >= 0]


def new_lead_facts(hist, begin, end, category):
    """New-lead accountability facts (spec 4 & 5), all event-time.
    Returns dict: is_new_lead, responded, first_response_seconds,
    new_lead_awaiting_counselor (NNR counselor side),
    nnr_awaiting_customer (NNR customer side)."""
    out = {'is_new_lead': False, 'responded': False, 'first_response_seconds': None,
           'new_lead_awaiting_counselor': False, 'nnr_awaiting_customer': False}
    if not hist or category == 'internal_staff':
        return out
    first = hist[0]
    if first['from_me'] or not (begin <= first['dt'] < end):
        return out
    out['is_new_lead'] = True
    reply = next((m for m in hist if m['from_me'] and m['dt'] > first['dt']), None)
    if reply is not None and reply['dt'] < end:
        out['responded'] = True
        out['first_response_seconds'] = (reply['dt'] - first['dt']).total_seconds()
        # Counselor answered; is the customer now silent past the cutoff?
        later_in = any(not m['from_me'] and m['dt'] > reply['dt'] for m in hist)
        last_out = max(m['dt'] for m in hist if m['from_me'])
        if (not later_in) and (end - last_out) > timedelta(hours=NNR_CUSTOMER_SILENCE_HOURS):
            out['nnr_awaiting_customer'] = True
    else:
        out['new_lead_awaiting_counselor'] = True
    return out


def extract_cgpa(text):
    """Best-effort CGPA from conversation text on a 4.0 scale, or None. Values
    above 4.0 are rejected (n8n flags these as impossible, not a valid CGPA)."""
    best = None
    for pat in (_CGPA_LABELLED, _CGPA_SUFFIX, _CGPA_SCALE):
        for m in pat.finditer(str(text or '')):
            try:
                val = float(m.group(1))
            except (TypeError, ValueError):
                continue
            if 0.0 <= val <= 4.0 and (best is None or val > best):
                best = val
    return best


def cgpa_tier(cgpa):
    """Map a CGPA to a tier using the original n8n bands. None if no CGPA."""
    if cgpa is None:
        return None
    for floor, name in CGPA_TIER_BANDS:
        if cgpa >= floor:
            return name
    return 'cold'


def lead_tier(hist, text, category, end=None):
    """Deterministic lead tier for RESPONSIVE leads only (contract 4.3). The ONLY
    deterministic basis is an explicit, valid CGPA mapped through the legacy bands.
    No CGPA (or no clear evidence) => None (tier pending verification). There is NO
    engagement-point scoring and NO fifth tier. The optional AI judge may assign a
    tier from broader qualification evidence; that path lives in audit_intelligence."""
    if category != 'responsive' or not hist:
        return None
    return cgpa_tier(extract_cgpa(text))


def tier_assessment(category, tier):
    """Provenance of the tier slot: ASSESSED when a tier is set, PENDING_REVIEW for a
    responsive lead with no justified tier, None for non-responsive chats (no tier)."""
    if category != 'responsive':
        return None
    return 'ASSESSED' if tier in TIERS else 'PENDING_REVIEW'


def canonical_category(kind, has_inbound, has_outbound):
    """Mutually-exclusive canonical class (contract 4.2) from the compat business
    category (``kind``: potential_lead/internal_staff/unclassified) and message
    directions. Ambiguous two-way chats become needs_review so the selected-total
    equation reconciles. ``empty`` is only reachable when a chat has no dated
    messages at all (build_summary pre-filters to in-window messages)."""
    if kind == 'internal_staff':
        return 'internal_staff'
    if not has_inbound and not has_outbound:
        return 'empty'
    if has_outbound and not has_inbound:
        return 'dead'
    if has_inbound and not has_outbound:
        return 'consultant_no_reply'
    if kind == 'potential_lead':
        return 'responsive'
    return 'needs_review'


def deterministic_status(hist, category):
    """Conservative deterministic lead status for RESPONSIVE leads (contract 4.4).
    CLOSED/REJECTED only on explicit counselor-side marker language; an unanswered
    customer turn => STALLED; otherwise PENDING (requires review). Returns
    (status, reason). Non-responsive => (None, '')."""
    if category != 'responsive' or not hist:
        return (None, '')
    out_text = ' '.join(str(m.get('text') or '').lower() for m in hist if m.get('from_me'))
    if any(k in out_text for k in HANDOVER_MARKERS):
        return ('closed', 'Counselor-side handover language detected; verify the referral.')
    if any(k in out_text for k in REJECTION_MARKERS):
        return ('rejected', 'Counselor communicated ineligibility; verify against source.')
    if reply_state(hist) == 'awaiting_counselor_reply':
        return ('stalled', 'Customer wrote last; awaiting a counselor reply.')
    return ('pending', 'Outcome not established by the available messages.')


def call_breakdown(window_msgs, is_new_lead):
    """Genuine call events in the window split by direction and new/follow-up at
    event time (spec 7). Durations counted only when > 0 (verified)."""
    out = {'inbound': 0, 'outbound': 0, 'new_lead': 0, 'follow_up': 0, 'verified_seconds': 0}
    for m in window_msgs:
        if 'call' not in m['media']:
            continue
        if m['from_me']:
            out['outbound'] += 1
        else:
            out['inbound'] += 1
        if is_new_lead:
            out['new_lead'] += 1
        else:
            out['follow_up'] += 1
        if m['dur'] > 0:
            out['verified_seconds'] += m['dur']
    return out
