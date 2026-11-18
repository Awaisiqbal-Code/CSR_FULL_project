# Scholarshiphive CSR v4.13 — Original n8n AI Chat Audit

## Scope (read first)
This is an **additive audit-only patch** applied after v4.11 (portal report preview) and v4.12 (Gemini / Claude adapter). It does NOT change the Chrome extension, WhatsApp sync, message deduplication, sender direction, calls, audio storage, API routes, database schema or employee access. It keeps report preview and optional PDF download.

The source was compared against the original n8n `Prepare Gemini Request` prompt from `WCE_3_Scheduler_Gemini_PDF_Email_BATCHED_RETRY.json` (provided by the user).

## Original n8n rules implemented

- Primary audit classification, exactly one per synchronized chat: `responsive`, `consultant_no_reply`, `dead`, `internal_staff`, `empty`, or `unclassified` (the last category explicitly covers incomplete/unverified AI analysis).
- **Responsive**: genuine study-abroad or scholarship inquiry with messages from counselor and prospect; mere small talk must not count as a lead.
- **Consultant No-Reply**: customer initiated a real inquiry and no counselor reply has been observed in the complete chat. **Dead**: counselor initiated a prospective-lead outreach and prospect never replied. If the collector marked capture incomplete, the audit falls back to `unclassified` rather than fabricating either failure.
- **Internal/Staff**: clear internal work, team, attendance or personal conversation; not a qualified student lead. **Empty**: a verifiably empty, nonfailed message capture.
- Responsive-only lead tiers: Very Hot = CGPA about 3.70+ with strong/final-year intent; Hot = 3.10–3.69; Average = 2.60–3.09; Cold = below 2.60 or explicit education mismatch. Verified contextual exceptions are flagged for human review. If CGPA/intent evidence is insufficient, no tier is invented.
- Responsive statuses: `closed` means **explicit country-counselor handoff**, not a sale; `rejected` requires explicit communicated ineligibility; otherwise `stalled`. Closed/rejected claims are conservatively checked for matching counselor-side text evidence; unsupported claims are downgraded to Stalled with a review reason.
- 10 framework dimensions: greeting, first response time, needs discovery, product knowledge, objection handling, upselling, closing, follow-up, professional tone, SOP compliance. Allowed evidence-based ratings: `STRONG`, `MIXED`, `WEAK`, `PARTIAL`, `CRITICAL`, `NONE` (no evidence). Do not invent timestamps, audio/call contents or violations.
- Per-chat reviewer notes, source message-ID references, action priority; aggregate QA ratings and bottom line.
- Accounting: Total audited chats = all six primary categories exactly once; Responsive = Very Hot + Hot + Average + Cold + Untiered. `Needs Review` and `Unread Excluded` remain **independent** flags/counters, never added to primary category totals.

**Important:** The audit's contextual AI categories are stored in each generated audit's JSON and do not rewrite the existing dashboard's rule-based `Conversation.state` fields. This prevents changing live operations. The Admin report displays audit classifications where available.

## Installation (Windows)

1. **BACK UP** your original CSR project and these target files: `backend/app/ai_audit.py`, `backend/app/ai_providers.py`, `backend/app/config.py`, `backend/app/reporting.py`, `admin-web/admin.js`.
2. Stop the **Audit Worker** and FastAPI server using Ctrl+C in their terminals. Avoid clicking Generate Audit during installation.
3. Extract this ZIP in a temporary folder; copy its `backend` and `admin-web` subfolders into your existing project root (for example `E:\DigiCon Valley\CSR\`). Select **Replace existing files**. Do not replace the whole `backend` folder with an empty new folder—**merge folders** and overwrite only the files listed here.
4. Your own `backend/.env` stays unchanged. Existing working test settings should be:
   ```dotenv
   AI_ALLOWED=true
   AUDIT_AI_PROVIDER=gemini
   GEMINI_API_KEY=YOUR_EXISTING_SECRET_KEY
   GEMINI_MODEL=YOUR_CURRENT_WORKING_LITE_MODEL
   ```
   `YOUR_EXISTING_SECRET_KEY` / `YOUR_CURRENT_WORKING_LITE_MODEL` are placeholders: **keep your actual currently working values**. Never share your `.env`.
5. Optional (use defaults first):
   ```dotenv
   AUDIT_AI_BATCH_SIZE=4
   AUDIT_AI_BATCH_DELAY_SECONDS=4.5
   ```
   The delay spreads out Gemini requests; it is **not** the existing 20-minute audit-job queue gap. The model is called per 4 conversations, so an audit of 71 chats can require about 18 classification requests plus one summary request (subject to quota and delays).
6. Restart **FastAPI** and **Audit Worker** using your existing startup `.bat` scripts. Refresh the Admin Portal with `Ctrl+Shift+R`.
7. Use one **new** test audit from your own test account. Old completed PDFs/saved report JSON are never recalculated automatically. Observe the report: Primary categories, lead tiers, per-chat evaluations, 10-dimension summary, bottom line. Download PDF only if needed.

## Safety / failure behavior

- No database migration, no SQL changes and no private recording access.
- Gemini may return HTTP 503/429; the engine stops further requests in that report after such an error, marks remaining chats `unclassified / AI unavailable`, and preserves existing deterministic counts. Do not interpret `unclassified` as proof the chat is not a real lead.
- Missing or invalid AI chat IDs cause the entire affected batch to be marked unavailable, rather than silently dropping or doubling chats.
- Source messages are redacted for email, phone and obvious credentials before sending to AI; raw **audio or calls are not uploaded to Gemini**. However, excerpts still contain business conversation text; use only authorized records and normal company privacy controls.
- Original n8n thresholds are **audit guidelines** and not university eligibility requirements.
- Gemini is for current testing. Production can select `AUDIT_AI_PROVIDER=claude` and configure the Claude API key/model, with the same reporting schema. Do this only after tests.
- This patch does NOT automatically fix old saved audit reports or the separate admin dashboard's original heuristic metrics.
- **Do not run the full historic backend test suite against a live PostgreSQL database**; a previous test caused a destructive DB reset. The added tests use synthetic input and are read-only.

## Targeted tests on your own machine

Inside the project root, in PowerShell:

```powershell
cd 'E:\DigiCon Valley\CSR\backend'
.\.venv\Scripts\python.exe -m pytest tests\test_v413_audit_intelligence.py tests\test_v413_report_pdf_unit.py tests\test_v412_ai_provider_adapter.py tests\test_v411_report_tiers_unit.py -q

cd 'E:\DigiCon Valley\CSR'
node .\admin-web\tests\test-audit-preview-v411.cjs
node .\admin-web\tests\test-audit-intelligence-v413.cjs
```

**Only run the above targeted tests**. Tests generate synthetic data, do not connect to the production database on their own, but your project-level imports may initialize a DB engine; never run tests on the live operations machine without an isolated `_test` configuration.

## Changed files

1. `backend/app/audit_intelligence.py` — new per-chat n8n rules adapter and result validation
2. `backend/app/ai_audit.py` — wires new engine into existing audit-worker AI step; preserves legacy provider path
3. `backend/app/ai_providers.py` — larger Gemini/Claude output token budget for 4-chat QA JSON
4. `backend/app/config.py` — optional batch size and delay configuration
5. `backend/app/reporting.py` — same PDF renderer, now prints verified audit breakdown, tiers and per-chat QA
6. `admin-web/admin.js` — same approved preview, now shows classification and individual QA details
7. `backend/tests/test_v413_audit_intelligence.py` — synthetic rules/validation/503 tests
8. `backend/tests/test_v413_report_pdf_unit.py` — synthetic PDF parity test
9. `admin-web/tests/test-audit-intelligence-v413.cjs` — synthetic portal preview test

**No changes to**: `extension/*`, `backend/app/main.py`, `backend/app/models.py`, `backend/app/worker.py`, database schema, private voice storage, original `.env` or previous PDF records.

## Rollback

Stop FastAPI/worker, restore your backed-up five edited source files (item numbers 2–6), optionally remove the new `audit_intelligence.py` and v4.13 test files, then restart FastAPI/worker. No DB rollback necessary.

## Local verification summary

- 66 Python tests passed in a **synthetic isolated SQLAlchemy test harness**; no live database was opened. Some old Admin tests refer to historic UI versions and are not the v4.11/v4.13 acceptance criteria.
- Both audit UI tests (`v4.11` and `v4.13`) passed using mocked DOM and API.
- JavaScript syntax and Python compile checks passed.
- A two-page synthetic ReportLab PDF was generated, extracted and visually rendered; categories, lead tiers and individual QA appear.
- **Real Gemini, Claude, live PostgreSQL and actual employee WhatsApp accounts have NOT been end-to-end tested from this environment.**
