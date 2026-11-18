"""v4.6 isolated inbox ordering and direction regression tests, no PostgreSQL."""
from datetime import datetime,timedelta,timezone
from sqlalchemy import create_engine,ForeignKey,DateTime,Integer,String,select
from sqlalchemy.orm import DeclarativeBase,Mapped,mapped_column,Session
from app.chat_overview import resolve_from_me
from app.inbox_ordering import recent_conversation_order

class Base(DeclarativeBase): pass
class Conversation(Base):
    __tablename__='v46_conversation'
    id: Mapped[int]=mapped_column(Integer,primary_key=True)
    title:Mapped[str]=mapped_column(String(60))
    last_seen_at:Mapped[datetime]=mapped_column(DateTime(timezone=True))
class Message(Base):
    __tablename__='v46_message'
    id:Mapped[int]=mapped_column(Integer,primary_key=True)
    conversation_id:Mapped[int]=mapped_column(ForeignKey('v46_conversation.id'))
    occurred_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True))

def test_sender_direction_evidence():
    assert resolve_from_me(False,'Hammad','',contact_title='Papa Jan',employee_name='Hammad') is True
    assert resolve_from_me(False,'hAmMaD','',contact_title='Papa Jan',employee_name='Hammad') is True
    assert resolve_from_me(False,'Papa Jan','',contact_title='Papa Jan',employee_name='Hammad') is False
    assert resolve_from_me(False,'Hammad','false_1234567890','Papa Jan','Hammad') is False
    assert resolve_from_me(True,'Papa Jan','true_1234567890','Papa Jan','Hammad') is True
    assert resolve_from_me(False,'Hammad','',contact_title='Hammad',employee_name='Hammad') is False
    assert resolve_from_me(False,'Another customer','',contact_title='Papa Jan',employee_name='Hammad') is False

def test_message_activity_order_beats_later_sync_time():
    engine=create_engine('sqlite+pysqlite:///:memory:')
    Base.metadata.create_all(engine)
    t=datetime(2026,11,16,10,0,tzinfo=timezone.utc)
    with Session(engine) as db:
        db.add_all([Conversation(id=1,title='Old chat recently synced',last_seen_at=t+timedelta(hours=2)),
                    Conversation(id=2,title='Newer chat synced earlier',last_seen_at=t)])
        db.add_all([Message(conversation_id=1,occurred_at=t-timedelta(days=2)),
                    Message(conversation_id=2,occurred_at=t+timedelta(minutes=1))]);db.commit()
        order=recent_conversation_order(Conversation,Message)
        titles=db.scalars(select(Conversation.title).order_by(*order)).all()
        assert titles==['Newer chat synced earlier','Old chat recently synced']
    engine.dispose()
