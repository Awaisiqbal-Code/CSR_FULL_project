# CSR v4.12 — Gemini test AI + Claude production adapter

**Scope:** Sirf audit AI enhancement. Existing WhatsApp collector, voice/call code, Admin UI, queue worker, PDF renderer aur PostgreSQL schema bilkul unchanged. `backend/.env` ZIP mein **nahi** hai.

## 1. Backup

Existing project ka complete backup lo. Minimum in files ka backup rakho:

- `backend/app/config.py`
- `backend/app/ai_audit.py`

Voice private storage aur PostgreSQL backup ko change, delete ya reset **na** karo.

## 2. ZIP se sirf 3 implementation files copy karo

- `backend/app/config.py` (replace)
- `backend/app/ai_audit.py` (replace)
- `backend/app/ai_providers.py` (**new**)

`backend/tests/test_v412_ai_provider_adapter.py` optional synthetic test file hai. Chrome extension, Admin Portal, `main.py`, `worker.py`, `reporting.py`, `analysis.py`, `requirements.txt`, database files **touch nahi** karne. httpx existing requirements mein hai.

## 3. Testing ke liye Gemini configure karo

**Apni local** `backend/.env` mein in lines ko add/update karo. ZIP mein real API key daalne ki zaroorat nahi.

```dotenv
AI_ALLOWED=true
AUDIT_AI_PROVIDER=gemini
GEMINI_API_KEY=PUT_YOUR_REAL_GEMINI_KEY_HERE_IN_LOCAL_ENV_ONLY
GEMINI_MODEL=gemini-3.5-flash
```

Agar `.env` mein existing `AI_ALLOWED=false` hai, same variable ki duplicate line mat rakho: value `true` kar do. Apna model ID Gemini API mein supported model ke mutabiq set karo. Default configured example har account mein guaranteed available nahi.

## 4. Worker restart

Windows PowerShell, project ke `backend` folder mein:

```powershell
.\.venv\Scripts\python.exe -m app.worker
```

Pehle purana worker stop karo, warna do worker processes same service pe chalenge. Admin Portal aur Chrome extension reload zaroori nahi kyunke unki files unchanged hain. `AI_ALLOWED` aur provider config worker startup par read hoti hai.

## 5. Controlled test

1. Portal mein ek counselor select karo jiski synced chats mein **Potential Lead** conversation ho. Other categories ka AI intentionally skip karta hai.
2. Admin -> Audit Reports -> Generate Audit.
3. Worker completion ke baad report automatically portal mein open ho; optional Download PDF button same rahega (v4.11).
4. Report mein **AI-Assisted Executive Analysis**, **10 QA findings** aur `AI status` verify karo.
5. Status agar `Gemini not configured` aaye: key / provider env check karo.
6. `HTTP 401/403`: API key/permissions; `HTTP 404`: selected model ID; `HTTP 429/503`: provider quota/high demand, later retry; `timeout`: network/provider. In sab mein **rule-based PDF/report still completes**.
7. AI actual voice audio/call content transcribe nahi karta. Sirf available synced text + media markers se evidence-based observations karta hai. Lead tiers Very Hot, Hot, Average, Cold retained hain **without fabricated scoring**.

## 6. Deployment ke baad Claude configure karna

Backend/Railway worker environment variables (not frontend):

```dotenv
AI_ALLOWED=true
AUDIT_AI_PROVIDER=claude
ANTHROPIC_API_KEY=PUT_REAL_CLAUDE_KEY_IN_SERVER_ENV_ONLY
CLAUDE_MODEL=claude-sonnet-5-5
```

Claude ke liye adapter included hai; deploy se pehle **real Claude account/model par controlled smoke test** lazmi hai. Provider switch **sirf backend environment** mein hoga; UI, PDF, classification schema, worker workflow unchanged rahega.

Existing OpenAI support compatibility ke liye retained hai but never silently falls back to it. Agar koi `AUDIT_AI_PROVIDER` configured na ho, legacy `openai` default hai; Gemini test ke liye explicitly `gemini` set karna zaroori hai.

## 7. Privacy, safety & known limitations

- `AI_ALLOWED=true` karne ke baad masked lead chat excerpts **third-party Gemini / Claude API ko transmit hotay hain**. Testing dummy/test account se karo. Names / free-form personal details ki redaction perfect nahi hai; actual client data ke liye privacy review chahiye.
- API keys sirf backend env variables mein; frontend, ZIP aur GitHub mein nahi.
- Read-only/mock tests; no live DB testing or real API keys used during preparation.
- Current lead-tier *assignment thresholds* not finalized: numeric tiers remain **Not assessed**. AI ka output score ya lead tier silently generate nahi karega.
- No database migration, drop, truncate, reset or historic data cleanup included.
- Existing reports saved in PostgreSQL untouched.

## 8. Rollback

Agar koi issue aaye, original `backend/app/config.py` and `backend/app/ai_audit.py` restore karo, `backend/app/ai_providers.py` remove kar do (if no longer referenced), worker restart. Database/old reports untouched.

## 9. Test commands (safe)

These are synthetic mocked tests; they don't connect to actual API or modify DB:

```powershell
cd "E:\DigiCon Valley\CSR\backend"
.\.venv\Scripts\python.exe -m pytest -q tests/test_v412_ai_provider_adapter.py
```

**Avoid running old broad/destructive integration suites on real database**. The project historically had a destructive test incident. v4.12 unit tests make no SQL connections.
