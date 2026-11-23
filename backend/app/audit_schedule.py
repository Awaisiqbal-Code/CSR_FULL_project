"""Daily automatic audit scheduling (deterministic; run by the worker process).

At AUDIT_SCHEDULE_HOUR local time each day, one audit is queued per eligible
employee -- an employee with at least one non-group (1:1) chat that has messages --
ordered A->Z by name, with each successive audit scheduled AUDIT_SCHEDULE_GAP_MINUTES
after the previous one. The worker only processes a scheduled job once its
``scheduled_for`` time has arrived, which produces the staggered generation. Manual
audits (scheduled_for NULL) are untouched and still run immediately.
"""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import select, func, not_
from sqlalchemy.orm import Session
from .models import User, Conversation, Message, AuditJob
from .analysis import group_conversation_condition
from . import config

# Per-process guard so we don't re-run the (heavier) eligibility query every loop
# once a day's batch has been handled. The DB check below is the real source of truth.
_last_handled_local_date = None


def schedule_tz():
    return ZoneInfo(config.AUDIT_SCHEDULE_TZ)


def run_start_utc(now_utc: datetime) -> datetime:
    """UTC instant of today's scheduled start (AUDIT_SCHEDULE_HOUR:00 local)."""
    local = now_utc.astimezone(schedule_tz())
    start_local = local.replace(hour=config.AUDIT_SCHEDULE_HOUR, minute=0, second=0, microsecond=0)
    return start_local.astimezone(timezone.utc)


def eligible_employees(db: Session):
    """Active, approved employees with >=1 non-group chat that has messages,
    ordered case-insensitively by name (A->Z), then id for stable ties."""
    has_chat = (select(Conversation.id).where(
        Conversation.employee_id == User.id,
        not_(group_conversation_condition()),
        select(Message.id).where(Message.conversation_id == Conversation.id).exists(),
    ).exists())
    stmt = (select(User).where(
        User.role == 'employee', User.approved.is_(True), User.active.is_(True), has_chat)
        .order_by(func.lower(func.trim(User.full_name)), User.id))
    return list(db.scalars(stmt).all())


def ensure_daily_batch(db: Session, now_utc: datetime | None = None) -> int:
    """Create today's scheduled audits once, if the run time has passed and they
    don't already exist. Returns the number of audits queued (0 if not due / already
    done / disabled). Safe to call frequently."""
    global _last_handled_local_date
    if not config.AUDIT_SCHEDULE_ENABLED:
        return 0
    now_utc = now_utc or datetime.now(timezone.utc)
    start = run_start_utc(now_utc)
    if now_utc < start:
        return 0  # today's run time hasn't arrived yet
    local_date = now_utc.astimezone(schedule_tz()).date()
    if _last_handled_local_date == local_date:
        return 0  # this process already handled today's batch
    # Source of truth: has any auto audit already been queued for today's run window?
    window_end = start + timedelta(hours=24)
    already = db.scalar(select(AuditJob.id).where(
        AuditJob.auto_generated.is_(True),
        AuditJob.scheduled_for >= start, AuditJob.scheduled_for < window_end).limit(1))
    if already:
        _last_handled_local_date = local_date
        return 0
    gap = timedelta(minutes=config.AUDIT_SCHEDULE_GAP_MINUTES)
    created = 0
    for i, emp in enumerate(eligible_employees(db)):
        slot = start + i * gap
        db.add(AuditJob(
            employee_id=emp.id, requested_by=emp.id, hours=25,
            range_start=slot - timedelta(hours=25), range_end=slot,
            period_label='Last 25 hours', scheduled_for=slot, auto_generated=True))
        created += 1
    if created:
        db.commit()
    _last_handled_local_date = local_date
    return created
