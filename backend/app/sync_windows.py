"""Pure calculations shared by local tests and the live PostgreSQL sync API."""
from datetime import datetime, timedelta, timezone

INITIAL_LOOKBACK = timedelta(days=8)
INCREMENTAL_OVERLAP = timedelta(minutes=90)

def since_for_sync(now_at: datetime, previous_success: datetime | None) -> datetime:
    """Return a UTC cutoff; only completed sessions are passed as previous_success."""
    if now_at.tzinfo is None:
        raise ValueError('now_at must be timezone-aware')
    now_at = now_at.astimezone(timezone.utc)
    if previous_success is None:
        return now_at - INITIAL_LOOKBACK
    if previous_success.tzinfo is None:
        raise ValueError('previous_success must be timezone-aware')
    previous_success=previous_success.astimezone(timezone.utc)
    # A bounded recheck for WhatsApp Web media that hydrates later than text.
    # Source IDs and fingerprints deduplicate records across overlap windows.
    return min(now_at, previous_success - INCREMENTAL_OVERLAP)
