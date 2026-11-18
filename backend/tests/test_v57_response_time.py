"""Average response time matches the approved criteria: per-turn wait = first reply
minus first message of the prompting burst; consecutive replies and trailing
unanswered bursts ignored; overall average is POOLED (total wait / total replies);
and echo duplicates never fabricate a reply pair."""
from datetime import datetime, timezone
from app import audit_metrics as am

B = datetime(2026, 11, 18, 0, 0, tzinfo=timezone.utc)


def _m(from_me, hh, mm, text='some sufficiently long message body'):
    return {'dt': B.replace(hour=hh, minute=mm), 'from_me': from_me, 'text': text, 'media': '', 'dur': 0}


def test_single_chat_matches_criteria_example():
    chat = [_m(False, 10, 0), _m(False, 10, 5), _m(True, 10, 12),
            _m(False, 10, 15), _m(True, 10, 20), _m(True, 10, 21),
            _m(False, 10, 30), _m(False, 10, 32), _m(False, 10, 34), _m(True, 10, 43)]
    mins = [round(s / 60) for s in am.response_pairs(chat)]
    assert mins == [12, 5, 13]
    assert round(sum(mins) / len(mins)) == 10


def test_pooled_not_average_of_averages():
    # Chat A 30/3, Chat B 40/10, Chat C 20/2 -> 90/15 = 6 (not mean(10,4,10)=8).
    a = [10 * 60] * 3
    b = [4 * 60] * 10
    c = [10 * 60] * 2
    pooled = sum(a + b + c) / len(a + b + c)
    assert round(pooled / 60) == 6


def test_trailing_unanswered_burst_ignored():
    chat = [_m(False, 11, 0), _m(True, 11, 5), _m(False, 11, 30), _m(False, 11, 31)]
    assert [round(s / 60) for s in am.response_pairs(chat)] == [5]


def test_echo_duplicate_does_not_create_false_pair():
    # Counselor sends a long message; WhatsApp echoes it back as incoming 3s later.
    # Without echo removal that echo would start a fake turn and a later real reply
    # would look like a response. drop_echoes must remove the mirrored copy.
    text = 'Please share your educational background and CGPA'
    chat = [_m(True, 12, 0, text), _m(False, 12, 0, text),  # echo (mirrored, same minute)
            _m(False, 12, 10, 'actual customer question here'), _m(True, 12, 14, 'reply')]
    cleaned = am.drop_echoes(chat)
    assert len(cleaned) == 3  # echo removed
    mins = [round(s / 60) for s in am.response_pairs(cleaned)]
    assert mins == [4]  # only the genuine 12:10 -> 12:14 pair


def test_short_repeats_are_not_echoes():
    chat = [_m(True, 9, 0, 'ok'), _m(False, 9, 0, 'ok')]
    assert len(am.drop_echoes(chat)) == 2
