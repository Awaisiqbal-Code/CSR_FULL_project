from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, Boolean, UniqueConstraint, LargeBinary, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base


def now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    employee_code: Mapped[str] = mapped_column(String(50), unique=True)
    phone: Mapped[str] = mapped_column(String(40), default='')
    whatsapp_number: Mapped[str] = mapped_column(String(45), unique=True)
    department: Mapped[str] = mapped_column(String(80), default='Counseling')
    designation: Mapped[str] = mapped_column(String(80), default='Counselor')
    password_hash: Mapped[str] = mapped_column(String(230))
    role: Mapped[str] = mapped_column(String(20), default='employee')
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    token_version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Conversation(Base):
    __tablename__ = 'conversations'
    __table_args__ = (UniqueConstraint('employee_id', 'external_key', name='uq_conversation_employee_key'),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    external_key: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(200))
    contact_number: Mapped[str] = mapped_column(String(60), default='')
    # Admin-verified display details are separate from collector-supplied raw fields.
    display_name_override: Mapped[str | None] = mapped_column(String(200), nullable=True)
    contact_number_override: Mapped[str | None] = mapped_column(String(60), nullable=True)
    state: Mapped[str] = mapped_column(String(30), default='unclassified')
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False)
    review_reason: Mapped[str] = mapped_column(String(300), default='')
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    messages: Mapped[list['Message']] = relationship(back_populates='conversation', cascade='all,delete-orphan')

class Message(Base):
    __tablename__ = 'messages'
    __table_args__ = (UniqueConstraint('conversation_id', 'fingerprint', name='uq_message_fingerprint'), Index('ix_message_time', 'timestamp'),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey('conversations.id'), index=True)
    fingerprint: Mapped[str] = mapped_column(String(64))
    sender: Mapped[str] = mapped_column(String(160), default='')
    from_me: Mapped[bool] = mapped_column(Boolean, default=False)
    text: Mapped[str] = mapped_column(Text, default='')
    media: Mapped[str] = mapped_column(String(90), default='')
    media_duration: Mapped[str] = mapped_column(String(60), default='')
    source_message_id: Mapped[str] = mapped_column(String(200), default='')
    timestamp: Mapped[str] = mapped_column(String(110), default='')  # source text preserved; may be locale-specific
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    time_quality: Mapped[str] = mapped_column(String(20), default="unknown")
    conversation: Mapped[Conversation] = relationship(back_populates='messages')

class VoiceAsset(Base):
    """Separate per-message voice capture state; audio bytes stay in private storage."""
    __tablename__='voice_assets'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    message_id: Mapped[int] = mapped_column(ForeignKey('messages.id', ondelete='CASCADE'),unique=True,index=True)
    status: Mapped[str] = mapped_column(String(20),default='pending',index=True)
    mime: Mapped[str] = mapped_column(String(50),default='')
    byte_size: Mapped[int] = mapped_column(Integer,default=0)
    sha256: Mapped[str] = mapped_column(String(64),default='')
    storage_key: Mapped[str] = mapped_column(String(100),default='')
    attempts: Mapped[int] = mapped_column(Integer,default=0)
    error: Mapped[str] = mapped_column(String(220),default='')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),default=now)

class SyncLog(Base):
    __tablename__ = 'sync_logs'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    conversations_seen: Mapped[int] = mapped_column(Integer, default=0)
    new_messages: Mapped[int] = mapped_column(Integer, default=0)
    unread_excluded: Mapped[int] = mapped_column(Integer, default=0)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    window_hours: Mapped[int] = mapped_column(Integer, default=25)
    status: Mapped[str] = mapped_column(String(30), default='completed')

class SyncCheckpoint(Base):
    """Per-employee server-owned successful-sync watermark."""
    __tablename__ = 'sync_checkpoints'
    employee_id: Mapped[int] = mapped_column(ForeignKey('users.id'), primary_key=True)
    last_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class SyncRun(Base):
    """A window advances only after every batch was acknowledged."""
    __tablename__ = 'sync_runs'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    since_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    planned_until: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(25), default='processing')
    initial: Mapped[bool] = mapped_column(Boolean, default=False)
    batches_saved: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

class AuditJob(Base):
    __tablename__ = 'audit_jobs'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    requested_by: Mapped[int] = mapped_column(ForeignKey('users.id'))
    hours: Mapped[int] = mapped_column(Integer, default=25)
    # Explicit reporting window (DB requested-changes spec, 2026-11-17). Rolling
    # filters store the computed UTC bounds; Previous Month / Custom store exact
    # bounds. period_label is the human-readable filter name shown in the report.
    range_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    range_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    period_label: Mapped[str] = mapped_column(String(60), default='')
    status: Mapped[str] = mapped_column(String(25), default='pending', index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    summary_json: Mapped[str] = mapped_column(Text, default='{}')
    pdf_bytes: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    error: Mapped[str] = mapped_column(String(400), default='')

class SecurityEvent(Base):
    __tablename__ = 'security_events'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    action: Mapped[str] = mapped_column(String(80))
    subject_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
