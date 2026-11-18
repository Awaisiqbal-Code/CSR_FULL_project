"""Production code predicate tested without a live DB connection.

Uses in-memory SQLAlchemy Core table; NO production PostgreSQL is touched.
"""
from datetime import datetime, timezone
from sqlalchemy import create_engine, select, func, MetaData, Table, Column, Integer, String, DateTime
from sqlalchemy.dialects import postgresql
from app.metrics import is_call_event, is_message_record


def message_table():
    return Table('messages', MetaData(), Column('id',Integer,primary_key=True),
                 Column('media',String(90)),Column('occurred_at',DateTime(timezone=True)))


def test_message_and_call_counts_consistent_with_missing_call_timestamps():
    engine=create_engine('sqlite+pysqlite:///:memory:')
    m=message_table();m.metadata.create_all(engine)
    november=datetime(2026,11,10,12,0,tzinfo=timezone.utc)
    with engine.begin() as conn:
        conn.execute(m.insert(),[
            {'id':i+1,'media':'voice' if i==0 else '', 'occurred_at':november} for i in range(629)
        ]+[
            {'id':630+i,'media':'call','occurred_at':None} for i in range(4)
        ])
        msg=conn.scalar(select(func.count()).select_from(m).where(is_message_record(m.c.media)))
        dated=conn.scalar(select(func.count()).select_from(m).where(
            is_message_record(m.c.media),m.c.occurred_at>=datetime(2026,11,1,tzinfo=timezone.utc),
            m.c.occurred_at<datetime(2026,12,1,tzinfo=timezone.utc)))
        calls=conn.scalar(select(func.count()).select_from(m).where(is_call_event(m.c.media)))
        unknown=conn.scalar(select(func.count()).select_from(m).where(is_call_event(m.c.media),m.c.occurred_at.is_(None)))
        assert (msg,dated,calls,unknown)==(629,629,4,4)
        assert conn.scalar(select(func.count()).select_from(m))==633
    engine.dispose()


def test_predicate_renders_postgres_without_data_migration():
    m=message_table()
    sql=str(select(m.c.id).where(is_call_event(m.c.media)).compile(dialect=postgresql.dialect()))
    assert 'lower' in sql and 'coalesce' in sql
