"""Hybrid tiering: an explicit CGPA uses the original n8n bands and overrides the
engagement point model; absent a CGPA the point model still applies. Pure unit
tests over audit_metrics -- no DB, no AI."""
from datetime import datetime, timezone, timedelta
from app import audit_metrics as am

END = datetime(2026, 11, 18, 12, 0, tzinfo=timezone.utc)


def _hist(n_in=3, n_out=1):
    msgs = []
    for i in range(n_in):
        msgs.append({'dt': END - timedelta(hours=n_in - i + 1), 'from_me': False,
                     'text': 'hi', 'media': '', 'dur': 0})
    for i in range(n_out):
        msgs.append({'dt': END - timedelta(minutes=30 - i), 'from_me': True,
                     'text': 'reply', 'media': '', 'dur': 0})
    return sorted(msgs, key=lambda m: m['dt'])


def test_extract_cgpa_labelled_and_scale():
    assert am.extract_cgpa('My cgpa 3.4 in BS') == 3.4
    assert am.extract_cgpa('GPA: 2.8') == 2.8
    assert am.extract_cgpa('scored 3.6/4 last term') == 3.6
    assert am.extract_cgpa('no grades mentioned') is None
    # Impossible-on-4.0-scale values are rejected (n8n flags, not a valid CGPA).
    assert am.extract_cgpa('cgpa 4.5') is None


def test_cgpa_bands_match_n8n():
    assert am.cgpa_tier(3.9) == 'very_hot'
    assert am.cgpa_tier(3.7) == 'very_hot'
    assert am.cgpa_tier(3.5) == 'hot'
    assert am.cgpa_tier(3.1) == 'hot'
    assert am.cgpa_tier(2.9) == 'average'
    assert am.cgpa_tier(2.6) == 'average'
    assert am.cgpa_tier(2.4) == 'cold'
    assert am.cgpa_tier(None) is None


def test_lead_tier_prefers_cgpa_over_point_model():
    # A low-CGPA but highly engaged lead is COLD by the authoritative CGPA band,
    # even though the engagement point model alone would score it higher.
    hist = _hist(n_in=6, n_out=2)
    tier = am.lead_tier(hist, 'admission scholarship apply Italy cgpa 2.3', 'potential_lead', END)
    assert tier == 'cold'


def test_lead_tier_falls_back_to_point_model_without_cgpa():
    hist = _hist(n_in=6, n_out=2)
    tier = am.lead_tier(hist, 'admission scholarship apply to Italy', 'potential_lead', END)
    assert tier in dict(am.TIER_THRESHOLDS)
    assert tier not in (None,)


def test_non_potential_lead_gets_no_tier():
    assert am.lead_tier(_hist(), 'cgpa 3.9', 'unclassified', END) is None
    assert am.lead_tier(_hist(), 'cgpa 3.9', 'internal_staff', END) is None
