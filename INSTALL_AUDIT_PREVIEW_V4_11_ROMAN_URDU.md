# Scholarshiphive CSR — Audit Portal Preview v4.11

## What is implemented

1. Admin > Audit Reports > **Generate Audit** retains the existing FastAPI `POST /audits` job queue.
2. The Admin Portal opens an **inline report viewer** immediately with queued/processing status and checks status every 4 seconds while that viewer is open in the Reports tab.
3. When the existing audit worker finishes, it automatically displays the **full saved audit summary** in the portal (not merely a toast).
4. **Download PDF** appears only on the completed report viewer, and is optional; PDF download still uses the existing authenticated `GET /audits/{id}/pdf` endpoint.
5. **Report History > View report** can reopen completed reports or inspect pending/failed jobs.
6. The report includes the existing **10 QA dimensions** and retained **Very Hot / Hot / Average / Cold** labels in BOTH portal and PDF.
7. Lead tier counts intentionally display **Not assessed** until the detailed tier-assignment rules are approved. The existing backend reports only Potential Leads; no arbitrary Hot/Cold scores or fake conversions are introduced.
8. If AI review is not configured or fails, the rule-based audit still displays with an honest status.

## What was NOT changed

- `extension/` content scripts, auto-sync and WhatsApp voice/call message detection
- FastAPI routes, authentication, DB schema, PostgreSQL database, and voice assets
- Existing audit queue/worker scheduling and `summary_json` / `pdf_bytes` storage
- Gemini/OpenAI provider settings and credentials. **The uploaded project currently uses an optional OpenAI API (`OPENAI_API_KEY`, `AI_ALLOWED`), NOT Gemini.**
- Existing chat analytics, sender direction, deduplication and audio playback

## Installation — replace only 4 files

**Before installing**: close/stop the local backend API and worker windows. Back up your whole CSR project, especially the original 4 files listed below. Do NOT reset PostgreSQL or delete voice files.

Extract the patch ZIP. Under your existing `E:\DigiCon Valley\CSR` folder, replace ONLY:

- `admin-web\index.html`
- `admin-web\admin.js`
- `admin-web\styles.css`
- `backend\app\reporting.py`

The patch also includes two optional tests under `admin-web/tests/` and `backend/tests/`, which do **not** need to be copied for the feature to work.

Then start your original `START_API_LOCAL.bat` and `START_WORKER_LOCAL.bat` in their respective windows. **Both are needed**: the worker creates the report and PDF; the API serves the Admin Portal and saved summary. Open your Admin Portal and hard-refresh with `Ctrl+Shift+R`.

### To test

1. Open Admin Portal > Audit reports.
2. Select one employee and a 25-hour / 7-day / 30-day period.
3. Click **Generate Audit** **once**; queued/processing status should be shown in the report viewer.
4. Once the worker completes, the full report should open automatically in that viewer.
5. Verify summary, conversation classification, QA dimensions, voice/call statistics and four retained tier headings.
6. Optionally click **Download PDF** in the viewer, and confirm it matches the current audit data.
7. Use **Report History > View report** to reopen the same report without generating it again.

### Troubleshooting

- If stuck at Queued, make sure your existing audit worker is running. Nothing in this patch changes the queue.
- If Failed, view the error text. No automatic retry or duplicate job is created.
- If AI analysis says Not configured, that is the existing optional API behavior, not a portal display failure.
- `Not assessed` in tier fields is correct: **exact Very Hot / Hot / Average / Cold scoring thresholds have NOT been agreed or implemented yet**.

### Rollback

Restore the **original 4 files from your pre-install project backup**. The source ZIP you uploaded was not modified. There is no database migration to undo.

## Evidence and test scope

- `node --check admin-web/admin.js` passed.
- `node admin-web/tests/test-audit-preview-v411.cjs` passed (mocked API; queued → completed, no automatic PDF download, history, 10 QA dimensions, text-safe rendering).
- `PYTHONPATH=backend pytest -q backend/tests/test_v411_report_tiers_unit.py` passed on synthetic report data.
- Generated an offline synthetic PDF and inspected both rendered pages, including the retained tier headings.
- The five **pre-existing** Admin test scripts already failed on the supplied ZIP baseline (for example, hard-coded `v3.9` assets while original HTML used `v4.6`). The patch did not introduce those historical failures. These tests were not silently altered.
- Live API/worker/PostgreSQL end-to-end behavior **not tested here**: no credentials or real database accessed, and no production sync or destructive test suite was run.
