import os
from pathlib import Path
from dotenv import load_dotenv

# Local development reads backend/.env. Railway config comes from service variables;
# existing environment variables always have precedence over the file.
load_dotenv(Path(__file__).resolve().parents[1] / '.env', override=False)

APP_ENV = os.getenv('APP_ENV', 'development').lower()
DB_URL = os.getenv('DATABASE_URL', '').strip()
if DB_URL.startswith('postgres://'):
    DB_URL = 'postgresql+psycopg://' + DB_URL[len('postgres://'):]
elif DB_URL.startswith('postgresql://'):
    DB_URL = 'postgresql+psycopg://' + DB_URL[len('postgresql://'):]

JWT_SECRET = os.getenv('JWT_SECRET', '').strip()
TOKEN_HOURS = int(os.getenv('TOKEN_HOURS', '12'))
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', '')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', '')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-4.1-mini')
AI_ALLOWED = os.getenv('AI_ALLOWED', 'false').lower() == 'true'

# Audit-only AI selection. Legacy default remains OpenAI until explicitly set.
# For testing: AUDIT_AI_PROVIDER=gemini; after deployment: claude.
AUDIT_AI_PROVIDER = os.getenv('AUDIT_AI_PROVIDER', 'openai').strip().lower()
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '').strip()
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash').strip()
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '').strip()
CLAUDE_MODEL = os.getenv('CLAUDE_MODEL', 'claude-sonnet-5-5').strip()

# AI-only throughput settings; four chats per request follows the old n8n batches.
AUDIT_AI_BATCH_SIZE = int(os.getenv('AUDIT_AI_BATCH_SIZE', '4'))
AUDIT_AI_BATCH_DELAY_SECONDS = float(os.getenv('AUDIT_AI_BATCH_DELAY_SECONDS', '4.5'))
# When true (and AI ran), the AI's per-chat category + lead tier become the
# authoritative business classification (old n8n/Gemini approach: AI-judged,
# CGPA-anchored). Chats the AI could not evaluate keep the deterministic result.
AUDIT_AI_CLASSIFY = os.getenv('AUDIT_AI_CLASSIFY', 'true').lower() == 'true'

# Automatic daily audit scheduling (worker). Each eligible employee (>=1 non-group
# chat) gets one audit per day starting at AUDIT_SCHEDULE_HOUR local time, A-Z by
# name, staggered AUDIT_SCHEDULE_GAP_MINUTES apart. Manual generation is unaffected.
AUDIT_SCHEDULE_ENABLED = os.getenv('AUDIT_SCHEDULE_ENABLED', 'true').lower() == 'true'
AUDIT_SCHEDULE_HOUR = int(os.getenv('AUDIT_SCHEDULE_HOUR', '18'))          # 18:00 = 6 PM
AUDIT_SCHEDULE_GAP_MINUTES = int(os.getenv('AUDIT_SCHEDULE_GAP_MINUTES', '20'))
AUDIT_SCHEDULE_TZ = os.getenv('AUDIT_SCHEDULE_TZ', 'Asia/Karachi')



def production_check():
    if not DB_URL.startswith('postgresql+psycopg://'):
        raise RuntimeError('PostgreSQL DATABASE_URL is required in local development AND Railway.')
    if 'CHANGE_ME' in DB_URL or 'your-password' in DB_URL:
        raise RuntimeError('Edit DATABASE_URL with your local PostgreSQL credentials.')
    if len(JWT_SECRET) < 40 or JWT_SECRET.startswith('REPLACE_'):
        raise RuntimeError('Set JWT_SECRET in backend/.env (40+ random characters).')
    if TOKEN_HOURS < 1 or TOKEN_HOURS > 24:
        raise RuntimeError('TOKEN_HOURS must be between 1 and 24.')
