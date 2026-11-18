from datetime import datetime, timezone, timedelta
from app.sync_windows import since_for_sync

def test_first_sync_is_eight_rolling_days():
    now=datetime(2026,11,12,12,tzinfo=timezone.utc)
    assert since_for_sync(now,None)==datetime(2026,11,4,12,tzinfo=timezone.utc)

def test_friday_to_monday_incremental_with_bounded_media_overlap():
    friday=datetime(2026,11,6,13,tzinfo=timezone.utc)
    monday=datetime(2026,11,9,11,tzinfo=timezone.utc)
    assert since_for_sync(monday,friday)==friday-timedelta(minutes=90)

def test_no_future_cutoff():
    now=datetime(2026,11,12,12,tzinfo=timezone.utc)
    assert since_for_sync(now,now+timedelta(days=2))==now
