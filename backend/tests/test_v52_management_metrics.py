"""Management-analytics metrics (Audit & Management Analytics spec, 18 Nov 2026).
Pure unit tests mapped to the spec's acceptance scenarios; no DB/AI/network."""
import os
os.environ.setdefault("DATABASE_URL","postgresql+psycopg://dummy:dummy@127.0.0.1:5432/csr_isolated_test")
os.environ.setdefault("APP_ENV","development")
os.environ.setdefault("JWT_SECRET","local-isolated-test-only-key-value-abcdefghijklmnopqrstuvwxyz123456789")
from datetime import datetime, timezone, timedelta
from app import audit_metrics as am

D = datetime(2026, 11, 17, tzinfo=timezone.utc)
def m(h, mnt, from_me, text='', media='', dur=0):
    return {'dt': D.replace(hour=h, minute=mnt), 'from_me': from_me, 'text': text, 'media': media, 'dur': dur}


def test_A04_A05_response_pairs_and_average():
    # 10:00 + 10:02 incoming (one turn) -> 10:07 reply = 7 min; 10:20 -> 10:32 = 12 min.
    msgs = [m(10,0,False,'admission?'), m(10,2,False,'and ielts?'), m(10,7,True,'hi'),
            m(10,20,False,'fee?'), m(10,32,True,'here')]
    secs = am.response_pairs(msgs)
    assert secs == [7*60, 12*60]
    assert round(sum(secs)/len(secs)) == 570  # 09:30


def test_A06_reply_then_newer_unanswered_is_awaiting():
    hist = [m(10,0,False,'q'), m(10,7,True,'a'), m(11,0,False,'another q')]
    assert am.reply_state(hist) == 'awaiting_counselor_reply'


def test_no_outbound_at_all_is_no_reply_observed():
    assert am.reply_state([m(10,0,False,'hi'), m(10,5,False,'anyone?')]) == 'no_reply_observed'


def test_replied_when_counselor_has_last_word():
    assert am.reply_state([m(10,0,False,'hi'), m(10,5,True,'hello')]) == 'replied'


def test_counselor_only_thread_is_no_action_required():
    assert am.reply_state([m(10,0,True,'fyi')]) == 'no_action_required'


def test_A07_new_lead_no_action_is_awaiting_counselor():
    begin = D.replace(hour=9); end = D.replace(hour=12)
    hist = [m(10,0,False,'I want admission in Italy')]
    f = am.new_lead_facts(hist, begin, end, 'potential_lead')
    assert f['is_new_lead'] and f['new_lead_awaiting_counselor']
    assert not f['responded'] and not f['nnr_awaiting_customer']


def test_new_lead_responded_then_customer_silent_is_nnr_customer():
    begin = D.replace(hour=9); end = D + timedelta(days=3)  # 3 days later => >24h silence
    hist = [m(10,0,False,'admission?'), m(10,30,True,'sure, details...')]
    f = am.new_lead_facts(hist, begin, end, 'potential_lead')
    assert f['is_new_lead'] and f['responded'] and f['nnr_awaiting_customer']
    assert f['first_response_seconds'] == 30*60


def test_A08_existing_followup_silent_is_not_new_lead():
    begin = D.replace(hour=9); end = D.replace(hour=23)
    # First-ever message is BEFORE the window => existing conversation, not a new lead.
    hist = [{'dt': D - timedelta(days=10), 'from_me': False, 'text': 'hi', 'media': '', 'dur': 0},
            m(10,0,True,'following up')]
    f = am.new_lead_facts(hist, begin, end, 'potential_lead')
    assert not f['is_new_lead'] and not f['new_lead_awaiting_counselor']


def test_A16_internal_staff_is_never_new_lead():
    begin = D.replace(hour=9); end = D.replace(hour=12)
    f = am.new_lead_facts([m(10,0,False,'university portal')], begin, end, 'internal_staff')
    assert not f['is_new_lead']


def test_A15_multi_country_lead_counts_once_globally():
    names, primary = am.extract_countries('I am considering Italy and also France for my masters')
    assert set(names) == {'Italy', 'France'}
    assert primary is None  # tie => multi-country, no single explicit preference


def test_single_explicit_country_has_primary():
    names, primary = am.extract_countries('I want to study in Germany, Germany is my goal')
    assert names == ['Germany'] and primary == 'Germany'


def test_unknown_country_when_no_evidence():
    assert am.extract_countries('hello how are you') == ([], None)


def test_A11_only_genuine_call_events_counted():
    # A real inbound call event (media='call') plus a text that merely says "voice call".
    msgs = [{'dt': D, 'from_me': False, 'text': '', 'media': 'call', 'dur': 0},
            {'dt': D, 'from_me': False, 'text': 'voice call', 'media': '', 'dur': 0}]
    cb = am.call_breakdown(msgs, is_new_lead=True)
    assert cb['inbound'] == 1 and cb['outbound'] == 0 and cb['new_lead'] == 1


def test_lead_tier_only_responsive_with_cgpa():
    hist = [m(10,0,False,'admission scholarship visa'), m(10,5,True,'hi'),
            m(10,6,False,'ielts'), m(10,7,False,'apply'), m(10,8,False,'fee'), m(10,9,False,'intake')]
    # Responsive + explicit CGPA => a band tier; no CGPA => pending (None); non-responsive => None.
    assert am.lead_tier(hist, 'admission apply Italy cgpa 3.4', 'responsive', D.replace(hour=11)) == 'hot'
    assert am.lead_tier(hist, 'admission scholarship apply Italy', 'responsive', D.replace(hour=11)) is None
    assert am.lead_tier(hist, 'cgpa 3.4', 'unclassified', D.replace(hour=11)) is None
