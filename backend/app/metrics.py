"""SQLAlchemy predicates for consistent message vs call-placeholder metrics.

Pass the media column explicitly so tests need not import the production
PostgreSQL engine or make DB/network connections.
"""
from sqlalchemy import func


def is_call_event(media_column):
    return func.lower(func.trim(func.coalesce(media_column, ''))) == 'call'


def is_message_record(media_column):
    return ~is_call_event(media_column)
