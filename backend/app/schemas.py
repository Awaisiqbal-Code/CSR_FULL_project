from datetime import date
from pydantic import BaseModel, Field, EmailStr

class SignUp(BaseModel):
    full_name: str = Field(min_length=2,max_length=120)
    email: EmailStr
    whatsapp_number: str = Field(min_length=7,max_length=45)
    password: str = Field(min_length=8,max_length=128)
    phone: str = Field(default='',max_length=40)
    department: str = Field(default='Counseling',max_length=80)
    designation: str = Field(default='Counselor',max_length=80)

class Login(BaseModel):
    email: EmailStr
    password: str

class Approval(BaseModel):
    approved: bool | None = None
    active: bool | None = None

class AdminPasswordSet(BaseModel):
    password: str = Field(min_length=8,max_length=128)

class PasswordChangeRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(min_length=8,max_length=128)

class MessageIn(BaseModel):
    sender: str = Field(default='',max_length=160)
    fromMe: bool = False
    text: str = Field(default='',max_length=100000)
    timestamp: str = Field(default='',max_length=110)
    media: str = Field(default='',max_length=90)
    mediaDuration: str = Field(default='',max_length=60)
    id: str = Field(default='',max_length=200)
    source_message_id: str = Field(default='',max_length=200)
    timestamp_ms: int | None = None
    timestamp_quality: str = Field(default="unknown", max_length=20)

class ChatIn(BaseModel):
    title: str = Field(min_length=1,max_length=200)
    id: str = Field(default='',max_length=200)
    contact_number: str = Field(default='',max_length=60)
    messages: list[MessageIn] = Field(default_factory=list,max_length=3000)
    needs_review: bool = False
    review_reason: str = Field(default='',max_length=300)

class SyncIn(BaseModel):
    chats: list[ChatIn] = Field(max_length=200)
    unread_count: int = Field(default=0,ge=0,le=100000)
    window_hours: int = Field(default=25,ge=1,le=17544)
    sync_run_id: str | None = Field(default=None,max_length=36)

class AuditRequest(BaseModel):
    employee_id: int | None = None
    hours: int = Field(default=25,ge=1,le=8760)
    # Reporting window selector (DB requested-changes spec). One of:
    # last_25h / last_7d / last_15d / last_30d / previous_month / custom.
    # 'custom' uses start/end (inclusive end, date-only, Asia/Karachi).
    period: str | None = None
    start: date | None = None
    end: date | None = None

class ChatQuestion(BaseModel):
    question: str = Field(min_length=2,max_length=1000)
    employee_id: int | None = None


class ContactCorrection(BaseModel):
    # None = leave unchanged; empty string = clear admin override.
    display_name: str | None = Field(default=None,max_length=200)
    contact_number: str | None = Field(default=None,max_length=60)

class VoiceUpload(BaseModel):
    message_id: int = Field(ge=1)
    data_url: str = Field(min_length=50,max_length=5600000)

class VoiceFailure(BaseModel):
    message_id: int = Field(ge=1)
    reason: str = Field(default='Media unavailable from WhatsApp Web',max_length=200)
