"""Evidence-based newest-first ordering for saved conversations.

The last sync/DB update time is NOT a substitute for a dated WhatsApp message.
Only conversations with no dated messages fall back to DB last_seen_at.
"""
from sqlalchemy import select, func


def recent_conversation_order(Conversation, Message):
    last_event=(select(func.max(Message.occurred_at))
                .where(Message.conversation_id==Conversation.id)
                .correlate(Conversation).scalar_subquery())
    return (func.coalesce(last_event,Conversation.last_seen_at).desc(),
            Conversation.id.desc())
