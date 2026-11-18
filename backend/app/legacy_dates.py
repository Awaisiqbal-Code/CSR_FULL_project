"""Evidence-driven recovery of old WhatsApp event timestamps.

Raw WhatsApp timestamps may use DD/MM/YYYY or MM/DD/YYYY. In particular
"9:18 am, 10/11/2026" MUST NOT be guessed from the machine's locale.

The order can be established by impossible-month dates (e.g. 31/10) or by
existing message rows that have both the original timestamp text and a
trusted exact ``occurred_at`` value. When evidence is missing/conflicting,
leave ambiguous dates NULL; NEVER treat DB insertion time as event time.
"""
from __future__ import annotations
from collections import Counter
from datetime import datetime, timedelta, timezone
import re
from zoneinfo import ZoneInfo

PKT = ZoneInfo('Asia/Karachi')
NUMERIC_DATE = re.compile(r'(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?!\d)')
ISO_DATE = re.compile(r'(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)')
CLOCK = re.compile(r'(?<!\d)([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*(am|pm)?\b', re.I)
NAMED_DATE_PATTERNS = (
    (r'(?<!\w)(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})(?!\w)', 'DMY'),
    (r'(?<!\w)(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})(?!\w)', 'MDY'),
)
MONTHS = {name: i for i, group in enumerate((('jan','january'),('feb','february'),('mar','march'),('apr','april'),('may',),('jun','june'),('jul','july'),('aug','august'),('sep','sept','september'),('oct','october'),('nov','november'),('dec','december')), start=1) for name in group}


def _year(y: int) -> int:
    return y + 2000 if y < 100 else y


def _candidate_date(a: int, b: int, year: int, order: str):
    """Return a real date in PKT (not a guessed event time)."""
    from datetime import date
    day, month = (a, b) if order == 'DMY' else (b, a)
    try:
        year = _year(year)
        if year < 2000 or year > 2100:
            return None
        return date(year, month, day)
    except ValueError:
        return None


def infer_date_order(stamps: list[str], dated_evidence=None) -> str | None:
    """Infer date order from hard calendar constraints or trusted exact rows.

    dated_evidence: iterable of (original_timestamp, occurred_at, time_quality).
    Three or more exact source/event matches with no contradictions are needed
    when all displayed numeric dates are ambiguous. "inferred" and
    "recovered" are deliberately NOT independent evidence.
    """
    votes = set()
    for stamp in stamps:
        for match in NUMERIC_DATE.finditer(stamp or ''):
            a, b = int(match[1]), int(match[2])
            if 12 < a <= 31 and 1 <= b <= 12:
                votes.add('DMY')
            if 12 < b <= 31 and 1 <= a <= 12:
                votes.add('MDY')
    if len(votes) > 1:
        return None
    hard_order = next(iter(votes)) if votes else None

    observed = Counter()
    for row in dated_evidence or ():
        stamp, event_at, quality = row
        if quality != 'exact' or event_at is None:
            continue
        match = NUMERIC_DATE.search(stamp or '')
        if not match:
            continue
        a, b, year = (int(match[i]) for i in (1, 2, 3))
        dmy = _candidate_date(a, b, year, 'DMY')
        mdy = _candidate_date(a, b, year, 'MDY')
        if not dmy or not mdy or dmy == mdy:
            continue
        if event_at.tzinfo is None:
            event_at = event_at.replace(tzinfo=timezone.utc)
        event_date = event_at.astimezone(PKT).date()
        if event_date == dmy:
            observed['DMY'] += 1
        elif event_date == mdy:
            observed['MDY'] += 1
    if hard_order:
        # A hard date signal wins unless there is strong contrary exact evidence:
        # conflicting sources must be reviewed, not silently forced.
        if observed['MDY' if hard_order == 'DMY' else 'DMY'] >= 3:
            return None
        return hard_order
    if observed['DMY'] >= 3 and not observed['MDY']:
        return 'DMY'
    if observed['MDY'] >= 3 and not observed['DMY']:
        return 'MDY'
    return None


def _clock(raw: str) -> tuple[int, int, int]:
    match = CLOCK.search(raw)
    if not match:
        return 0, 0, 0
    hour, minute, second = int(match[1]), int(match[2]), int(match[3] or 0)
    period = (match[4] or '').lower()
    if period:
        if hour < 1 or hour > 12:
            raise ValueError('Invalid AM/PM hour')
        hour = hour % 12 + (12 if period == 'pm' else 0)
    return hour, minute, second


def _datetime(day: int, month: int, year: int, raw: str, saved_at: datetime) -> datetime | None:
    year = _year(year)
    if year < 2000 or year > 2100:
        return None
    try:
        result = datetime(year, month, day, *_clock(raw), tzinfo=PKT).astimezone(timezone.utc)
    except ValueError:
        return None
    reference = saved_at if saved_at.tzinfo else saved_at.replace(tzinfo=timezone.utc)
    if result > reference.astimezone(timezone.utc) + timedelta(days=1):
        return None
    return result


def recover_message_date(raw: str, saved_at: datetime, date_order: str | None = None) -> datetime | None:
    """Return an original event datetime only when its date is supportable."""
    raw = (raw or '').strip()
    if not raw:
        return None
    iso = ISO_DATE.search(raw)
    if iso:
        return _datetime(int(iso[3]), int(iso[2]), int(iso[1]), raw, saved_at)
    for regex, fmt in NAMED_DATE_PATTERNS:
        match = re.search(regex, raw, re.I)
        if not match:
            continue
        if fmt == 'DMY':
            day, month_str, year = int(match[1]), match[2].lower(), int(match[3])
        else:
            month_str, day, year = match[1].lower(), int(match[2]), int(match[3])
        month = MONTHS.get(month_str) or MONTHS.get(month_str[:3])
        return _datetime(day, month, year, raw, saved_at) if month else None
    numeric = NUMERIC_DATE.search(raw)
    if numeric:
        a, b, year = (int(numeric[i]) for i in (1, 2, 3))
        if a > 12 and b <= 12:
            order = 'DMY'
        elif b > 12 and a <= 12:
            order = 'MDY'
        elif date_order in ('DMY', 'MDY'):
            order = date_order
        else:
            candidates = {x for x in (
                _datetime(a, b, year, raw, saved_at),
                _datetime(b, a, year, raw, saved_at)
            ) if x is not None}
            return next(iter(candidates)) if len(candidates) == 1 else None
        day, month = (a, b) if order == 'DMY' else (b, a)
        return _datetime(day, month, year, raw, saved_at)
    # Relative labels are anchored to ORIGINAL insertion, never script run date.
    if re.search(r'\b(today|yesterday)\b', raw, re.I):
        ref = saved_at if saved_at.tzinfo else saved_at.replace(tzinfo=timezone.utc)
        d = ref.astimezone(PKT).date()
        if re.search(r'\byesterday\b', raw, re.I):
            d -= timedelta(days=1)
        return _datetime(d.day, d.month, d.year, raw, saved_at)
    return None


def recover_with_company_evidence(raw: str, saved_at: datetime, company_order: str | None) -> datetime | None:
    """Conservative fallback when one employee lacks local locale evidence.

    A cross-employee date order is *not* sufficient alone: a different employee
    might use a different WhatsApp locale. Accept an otherwise ambiguous date
    only if the chosen interpretation lies within the original eight-day
    ingestion window, while the alternative date does not. Neither insertion
    time nor the company's preferred locale is used as an invented message date.
    """
    if company_order not in ('DMY', 'MDY') or not (raw or '').strip():
        return None
    # Already unambiguous dates are handled by recover_message_date alone.
    if recover_message_date(raw, saved_at) is not None:
        return None
    chosen = recover_message_date(raw, saved_at, company_order)
    other = recover_message_date(raw, saved_at, 'MDY' if company_order == 'DMY' else 'DMY')
    if chosen is None or other is None or chosen == other:
        return None
    reference = saved_at if saved_at.tzinfo else saved_at.replace(tzinfo=timezone.utc)
    earliest = reference - timedelta(days=8, hours=12)
    latest = reference + timedelta(hours=4)
    # A message fetched during initial 8-day sync should be near its original
    # insertion time. The other locale must be inconsistent with that window.
    if earliest <= chosen <= latest and not (earliest <= other <= latest):
        return chosen
    return None
