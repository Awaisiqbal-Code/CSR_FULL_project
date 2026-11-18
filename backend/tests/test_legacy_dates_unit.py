"""Pure unit tests. Do not require PostgreSQL or modify user data."""
import unittest
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from app.legacy_dates import infer_date_order, recover_message_date, recover_with_company_evidence

PKT=ZoneInfo('Asia/Karachi')
REFERENCE=datetime(2026,11,12,22,0,tzinfo=PKT).astimezone(timezone.utc)

def pkt(dt):
    return dt.astimezone(PKT).strftime('%Y-%m-%d %H:%M:%S') if dt else None

class LegacyDateTests(unittest.TestCase):
    def test_iso(self):
        self.assertEqual(pkt(recover_message_date('2026-11-11 20:15',REFERENCE)),'2026-11-11 20:15:00')
    def test_unambiguous_dmy(self):
        self.assertEqual(pkt(recover_message_date('31/10/2026, 18:44',REFERENCE)),'2026-10-31 18:44:00')
    def test_unambiguous_mdy(self):
        self.assertEqual(pkt(recover_message_date('10/31/2026, 18:44',REFERENCE)),'2026-10-31 18:44:00')
    def test_ambiguous_with_order_signal(self):
        self.assertEqual(infer_date_order(['31/10/2026, 09:00','01/11/2026 11:00']), 'DMY')
        self.assertEqual(pkt(recover_message_date('01/11/2026 11:00',REFERENCE,'DMY')), '2026-11-01 11:00:00')
    def test_ambiguous_without_signal_not_guessed(self):
        self.assertIsNone(recover_message_date('01/11/2026, 11:00',REFERENCE))
    def test_same_day_month_unambiguous(self):
        self.assertEqual(pkt(recover_message_date('11/11/2026, 14:30',REFERENCE)), '2026-11-11 14:30:00')
    def test_impossible_future_disambiguation(self):
        self.assertEqual(pkt(recover_message_date('12/11/2026, 11:00',REFERENCE)), '2026-11-12 11:00:00')
    def test_relative_anchor_original_save(self):
        self.assertEqual(pkt(recover_message_date('Yesterday 10:05 PM',REFERENCE)), '2026-11-11 22:05:00')
    def test_only_time_does_not_recover(self):
        self.assertIsNone(recover_message_date('21:55',REFERENCE))
    def test_invalid_date(self):
        self.assertIsNone(recover_message_date('31/02/2026, 10:00',REFERENCE))
    def test_locale_evidence_from_existing_exact_events(self):
        exact=datetime(2026,11,10,9,18,tzinfo=PKT).astimezone(timezone.utc)
        sources=['9:18 am, 10/11/2026','9:19 am, 10/11/2026','9:20 am, 10/11/2026']
        trusted=[(stamp,exact,'exact') for stamp in sources]
        self.assertEqual(infer_date_order(sources,trusted),'DMY')
        self.assertEqual(pkt(recover_message_date(sources[0],REFERENCE,'DMY')),'2026-11-10 09:18:00')

    def test_conflicting_exact_locale_signals_not_used(self):
        dmy=datetime(2026,11,10,9,18,tzinfo=PKT).astimezone(timezone.utc)
        mdy=datetime(2026,10,11,9,18,tzinfo=PKT).astimezone(timezone.utc)
        src='9:18 am, 10/11/2026'
        self.assertIsNone(infer_date_order([src]*6,[(src,dmy,'exact')]*3+[(src,mdy,'exact')]*3))

    def test_inferred_epochs_do_not_establish_locale(self):
        dmy=datetime(2026,11,10,9,18,tzinfo=PKT).astimezone(timezone.utc)
        src='9:18 am, 10/11/2026'
        self.assertIsNone(infer_date_order([src]*3,[(src,dmy,'inferred')]*3))

    def test_missing_timestamp_never_invented(self):
        self.assertIsNone(recover_message_date('',REFERENCE,'DMY'))

    def test_datetime_clock_source_precedes_ambiguous_numeric_date(self):
        self.assertEqual(pkt(recover_message_date('11:13 pm, 10/11/2026',REFERENCE,'DMY')),'2026-11-10 23:13:00')

    def test_numeric_date_order_is_locale_specific(self):
        self.assertEqual(pkt(recover_message_date('9:18 am, 10/11/2026',REFERENCE,'DMY')),'2026-11-10 09:18:00')
        self.assertEqual(pkt(recover_message_date('9:18 am, 10/11/2026',REFERENCE,'MDY')),'2026-10-11 09:18:00')

    def test_future_ambiguous_does_not_override_hard_evidence(self):
        self.assertEqual(infer_date_order(['31/10/2026, 09:00']),'DMY')

    def test_cross_employee_locale_fallback_only_with_window_proof(self):
        # Hammad: 10 Nov source, imported 10 Nov. Oct 11 is outside initial
        # eight-day import, so DMY has independent temporal corroboration.
        saved=datetime(2026,11,10,21,0,tzinfo=PKT).astimezone(timezone.utc)
        self.assertEqual(pkt(recover_with_company_evidence('6:18 pm, 10/11/2026',saved,'DMY')),
                         '2026-11-10 18:18:00')
        self.assertIsNone(recover_with_company_evidence('6:18 pm, 10/11/2026',saved,'MDY'))

    def test_cross_employee_locale_fallback_rejects_old_and_empty(self):
        saved=datetime(2026,12,10,21,0,tzinfo=PKT).astimezone(timezone.utc)
        self.assertIsNone(recover_with_company_evidence('6:18 pm, 10/11/2026',saved,'DMY'))
        self.assertIsNone(recover_with_company_evidence('',saved,'DMY'))

    def test_cross_employee_locale_fallback_rejects_nondiscriminative_date(self):
        saved=datetime(2026,11,10,21,0,tzinfo=PKT).astimezone(timezone.utc)
        self.assertIsNone(recover_with_company_evidence('10:00 am, 11/11/2026',saved,'DMY'))

    def test_past_months_not_forced_into_current_month(self):
        self.assertEqual(pkt(recover_message_date('31/10/2026 10:00',REFERENCE)), '2026-10-31 10:00:00')

if __name__=='__main__':unittest.main()

# Company-wide original timestamp evidence can safely assist a user lacking
# exact message epochs only when the alternative interpretation is outside the
# original eight-day ingestion window.
def test_company_raw_date_evidence_allows_proven_dmy():
    raw_sources = ['31/10/2026, 09:00', '10/11/2026, 18:18']
    company_order = infer_date_order(raw_sources, [])
    assert company_order == 'DMY'
    imported = datetime(2026, 11, 10, 21, 0, tzinfo=PKT).astimezone(timezone.utc)
    result = recover_with_company_evidence('6:18 pm, 10/11/2026', imported, company_order)
    assert pkt(result) == '2026-11-10 18:18:00'


def test_company_raw_conflict_blocks_fallback():
    order = infer_date_order(['31/10/2026, 09:00', '10/31/2026, 09:00'], [])
    assert order is None
    imported = datetime(2026, 11, 10, 21, 0, tzinfo=PKT).astimezone(timezone.utc)
    assert recover_with_company_evidence('6:18 pm, 10/11/2026', imported, order) is None


def test_unverified_company_locale_does_not_invent_old_dates():
    imported = datetime(2026, 12, 12, 14, 0, tzinfo=PKT).astimezone(timezone.utc)
    assert recover_with_company_evidence('6:18 pm, 10/11/2026', imported, 'DMY') is None
