"""Strict, evidence-based repair of a single WhatsApp voice placeholder.

No source IDs are synthesized. Never convert an actual text message, a call,
or an existing document into an audio recording just because it has a duration.
"""
import re

_TRUSTED_MESSAGE_ID = re.compile(r'^(?:true|false)_[^\s|]{6,}$', re.I)

def can_promote_image_to_voice(*, saved_media: str, saved_text: str,
                               incoming_media: str, existing_source: str,
                               incoming_source: str) -> bool:
    """Only a strong ID match and a metadata-only image placeholder qualify."""
    if not existing_source or existing_source != incoming_source:
        return False
    if not _TRUSTED_MESSAGE_ID.fullmatch(existing_source):
        return False
    if (saved_media or '').strip().lower() != 'image':
        return False
    if (incoming_media or '').strip().lower() not in ('voice', 'audio'):
        return False
    # A message with substantive text or a real document must never be replaced.
    if (saved_text or '').strip().lower() not in ('', '<image omitted>', '[image]', '[image detected]'):
        return False
    return True


def can_promote_call_placeholder(*, saved_media: str, saved_text: str,
                                  incoming_media: str, existing_source: str,
                                  incoming_source: str) -> bool:
    """Do not overwrite real messages or other media with inferred call events."""
    if not existing_source or existing_source != incoming_source:
        return False
    if not _TRUSTED_MESSAGE_ID.fullmatch(existing_source):
        return False
    if (incoming_media or '').strip().lower() != 'call':
        return False
    if (saved_media or '').strip().lower() not in ('', 'system'):
        return False
    # Only an already-recorded call system line can be upgraded. This is
    # NOT permission to turn normal text that mentions calling into call data.
    import re
    text=(saved_text or '').strip()
    return bool(re.fullmatch(
        r'(?i)(?:you\s+missed\s+(?:a\s+)?(?:voice\s+|video\s+)?call|'
        r'(?:missed|incoming|outgoing)\s+(?:voice\s+|video\s+)?call|'
        r'(?:voice|video)\s+call(?:\s+ended)?)', text))
