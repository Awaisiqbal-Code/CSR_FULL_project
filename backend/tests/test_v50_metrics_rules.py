"""Acceptance tests for the corrected Chat Metrics & Classification rules
(spec v1.0, 2026-11-17). Pure unit tests -- no database, no live data."""
from datetime import datetime, timezone, timedelta
from app.chat_overview import analyze_message_rows
from app.analysis import classify

T = datetime(2026, 11, 17, 10, 0, tzinfo=timezone.utc)  # 10:00


def _row(i, cid, from_me, minute, media=''):
    return (i, cid, from_me, T + timedelta(minutes=minute), media, '')


# --- Response time / turns (spec 3) ---

def test_T01_consecutive_customer_msgs_form_one_turn():
    # Incoming 10:00 + 10:02, counselor reply 10:07 => ONE turn, 7 min.
    rows = [_row(1, 11, False, 0), _row(2, 11, False, 2), _row(3, 11, True, 7)]
    out = analyze_message_rows(rows, {11})
    assert out['response_pairs'] == 1
    assert out['avg_response_seconds'] == 7 * 60
    assert out['responded_chats'] == 1


def test_T02_two_turns_average():
    # + second turn: incoming 10:20, reply 10:32 => durations 7 and 12, avg 9:30.
    rows = [_row(1, 11, False, 0), _row(2, 11, False, 2), _row(3, 11, True, 7),
            _row(4, 11, False, 20), _row(5, 11, True, 32)]
    out = analyze_message_rows(rows, {11})
    assert out['response_pairs'] == 2
    assert out['avg_response_seconds'] == round(((7 + 12) * 60) / 2)  # 570 == 9:30


def test_T03_replied_earlier_but_latest_turn_awaiting():
    # Replied at 10:03, new unanswered question at 10:30.
    rows = [_row(1, 11, False, 0), _row(2, 11, True, 3), _row(3, 11, False, 30)]
    out = analyze_message_rows(rows, {11})
    assert out['responded_chats'] == 1          # "Chats Replied (period)" historical
    assert out['chats_with_pending_reply'] == 1
    assert out['currently_awaiting_reply'] == 1  # current-state dimension
    assert out['no_reply_observed_chats'] == 0   # it WAS replied, so not "never replied"


def test_no_reply_counts_as_awaiting():
    # Incoming only, never answered => no_reply_observed AND currently_awaiting_reply.
    rows = [_row(1, 11, False, 0)]
    out = analyze_message_rows(rows, {11})
    assert out['no_reply_observed_chats'] == 1
    assert out['currently_awaiting_reply'] == 1
    assert out['avg_response_seconds'] is None


# --- Classification (spec 5) ---

def test_T06_generic_work_vocabulary_is_not_a_lead():
    # "university website update" -- a single generic term must NOT become a lead,
    # and internal_staff is only assigned from a verified roster/override.
    assert classify('Update the university website banner') == 'unclassified'
    assert classify('share the verification code for the portal') == 'unclassified'


def test_T07_lead_from_contextual_intent():
    assert classify('I have 2.8 CGPA. Can you help me apply to Germany?') == 'potential_lead'
    assert classify('I want study abroad details, please call me') == 'potential_lead'


def test_T08_lead_retained_after_thanks():
    # Full persisted history still carries the lead intent; a later "Thanks" must
    # not reset the category.
    history = 'Can you help me with scholarship admission? ... Thanks'
    assert classify(history) == 'potential_lead'


def test_internal_staff_only_when_verified():
    assert classify('update the portal', staff_verified=True) == 'internal_staff'
    assert classify('anything', manual_category='internal_staff') == 'internal_staff'


def test_category_independent_of_needs_review():
    # needs_review must not change the business category (three independent dims).
    assert classify('help me apply to Germany', needs_review=True) == 'potential_lead'
    assert classify('hello', needs_review=True) == 'unclassified'
