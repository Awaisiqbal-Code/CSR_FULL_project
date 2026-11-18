from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import DB_URL, production_check

# Fail early rather than silently creating a local SQLite file.
production_check()
engine = create_engine(DB_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

def create_tables():
    # Initial bootstrap only. Future schema modifications require Alembic migrations.
    from . import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    # Safe additive migration for existing PostgreSQL installations. No drops.
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ"))
        conn.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS time_quality VARCHAR(20) DEFAULT 'unknown'"))
        conn.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS source_message_id VARCHAR(200) DEFAULT ''"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_message_occurred_at ON messages (occurred_at)"))
        # Additive, nullable overrides; never rewrite old chats or audit PDFs.
        conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS display_name_override VARCHAR(200)"))
        conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_number_override VARCHAR(60)"))
        # Audit reporting window (additive, nullable; preserves existing audit rows).
        conn.execute(text("ALTER TABLE audit_jobs ADD COLUMN IF NOT EXISTS range_start TIMESTAMPTZ"))
        conn.execute(text("ALTER TABLE audit_jobs ADD COLUMN IF NOT EXISTS range_end TIMESTAMPTZ"))
        conn.execute(text("ALTER TABLE audit_jobs ADD COLUMN IF NOT EXISTS period_label VARCHAR(60) DEFAULT ''"))

def get_db():
    with SessionLocal() as db:
        yield db
