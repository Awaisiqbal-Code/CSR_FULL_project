"""Echo-duplicate collapse for the conversation view (display-only). A WhatsApp-Web
artifact mirrors a message under the opposite direction; we hide the mirrored copy."""
from datetime import datetime, timezone, timedelta
from app.chat_overview import collapse_echoes

T = datetime(2026, 11, 18, 9, 0, tzinfo=timezone.utc)


def _row(i, text, from_me, offset_s, source_id=''):
    return {'id': i, 'text': text, 'from_me': from_me,
            'dt': T + timedelta(seconds=offset_s), 'source_id': source_id}


def test_mirrored_echo_is_collapsed_keeping_authoritative():
    rows = [
        _row(1, 'Please share your educational background and CGPA', True, 0, 'true_abc@c.us'),
        _row(2, 'Please share your educational background and CGPA', False, 5),  # echo, no id
        _row(3, 'Sure, my cgpa is 3.4', False, 60, 'false_def@c.us'),
    ]
    out = collapse_echoes(rows)
    ids = [r['id'] for r in out]
    assert ids == [1, 3]  # the mirrored echo (2) is hidden, authoritative (1) kept


def test_short_acknowledgements_never_collapsed():
    rows = [
        _row(1, 'ok', True, 0),
        _row(2, 'ok', False, 3),  # genuine short reply, both kept
    ]
    assert [r['id'] for r in collapse_echoes(rows)] == [1, 2]


def test_same_direction_duplicate_is_not_an_echo():
    rows = [
        _row(1, 'I want admission in Italy please guide', False, 0),
        _row(2, 'I want admission in Italy please guide', False, 4),  # double-send, same side
    ]
    assert [r['id'] for r in collapse_echoes(rows)] == [1, 2]


def test_far_apart_duplicates_are_kept():
    rows = [
        _row(1, 'Please send your passport scan today', True, 0),
        _row(2, 'Please send your passport scan today', False, 600),  # 10 min later: not an echo
    ]
    assert [r['id'] for r in collapse_echoes(rows)] == [1, 2]


def test_keeps_earlier_when_neither_is_authoritative():
    rows = [
        _row(1, 'Share your educational background and documents', True, 0),
        _row(2, 'Share your educational background and documents', False, 6),
    ]
    assert [r['id'] for r in collapse_echoes(rows)] == [1]
