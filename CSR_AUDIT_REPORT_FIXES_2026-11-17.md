# Audit Report — Requested Changes Implemented

**Date:** 2026-11-17
**Spec:** *ScholarshipHive CSR — DB Requested Changes* (audit reporting period + AI reliability)
**Guarantee honored:** no changes to the WhatsApp extension, voice/call detection, media
playback, PDF *layout*, employee auth, or stored data. The DB change is additive only; a fresh
backup was taken earlier today (`scholarshiphive_csr_2026-11-17_premetrics.backup`).

**Tests:** backend **79 passed, 1 skipped** (includes 2 new audit tests). Extension **9/9**.

---

## 1. Reporting period — six filters (spec §2)

The audit "Reporting window" now offers all six required options, computed in **Asia/Karachi**
and stored as explicit UTC bounds on the job at **generation time**:

| Filter | How it's computed |
|--------|-------------------|
| Last 25 hours | `now − 25h` → `now` (rolling, from exact generation time) |
| Last 7 days | `now − 168h` → `now` |
| Last 15 days | `now − 360h` → `now` |
| Last 30 days | `now − 720h` → `now` |
| Previous month | full previous **calendar** month in PKT (not a rolling 30 days) |
| Custom dates | selected start/end, **inclusive** end date (PKT day boundaries) |

Rolling windows are measured from the generation time — **not** midnight or last-sync time.
*(`backend/app/main.py` → `submit_audit`; UI in `admin-web/index.html` + `admin.js`)*

## 2. Message-level filtering — the core bug (spec §3)

**Before:** `build_summary` selected whole conversations by `Conversation.last_seen_at` and then
analyzed **every** message in them — so a conversation that was merely recently active dragged in
its months-old messages.

**After:** `build_summary` filters at the **individual message `occurred_at`** level. Only
messages whose timestamp falls in `[begin, end)` are analyzed; a conversation is included only if
it has at least one in-window message. The same window flows to the counts, classification, AI
input and PDF. *(`backend/app/analysis.py`)*

## 3. No silent all-time fallback + visible scope (spec §3)

- An empty selected window now returns an explicit **no-data** result with a clear note — it
  never quietly switches to an all-time report.
- The report/PDF now shows the **period label**, **eligible chats**, and **messages analyzed**.
- **Undated / invalid timestamps** are counted as `undated_excluded` and flagged in the quality
  notes — never assigned an invented date or counted inside the period.
*(`analysis.py`, `backend/app/reporting.py`, `main.py` audit endpoints)*

## 4. Gemini / AI audit (spec §4) — already resolved, confirmed robust

You fixed the Gemini credentials and removed the key from `.env` for security. The AI layer
(`ai_audit.py` + your v4.13 `ai_providers.py` / `audit_intelligence.py`) already meets the spec:

- **Provider is configurable** via `AUDIT_AI_PROVIDER` — `gemini` for dev/testing, `claude` after
  deployment — without changing reporting rules or layout.
- **Graceful, honest fallback:** on missing key, unsupported provider, or an API/parse failure,
  affected fields stay `"Not assessed"` / `"…unavailable"` and the deterministic evidence path is
  used and **clearly labelled** (`ai_status`) — unknown counts are never shown as verified zeros.
- Batching + delay are already in place (`AUDIT_AI_BATCH_SIZE`, `AUDIT_AI_BATCH_DELAY_SECONDS`).

No code change was needed here beyond confirming it; with the key removed, reports will correctly
read "AI analysis unavailable" until a key is configured again (set `GEMINI_API_KEY` or switch
`AUDIT_AI_PROVIDER=claude` + `ANTHROPIC_API_KEY`).

## 5. Classification & exclusions (spec §5)

Unchanged and already correct from today's earlier work: unread chats are excluded by the
collector; `needs_review` is an independent flag (not a category); "no evidence", "not assessed",
and "actual zero" remain distinct. See `CHAT_METRICS_RULES_FIXES_2026-11-17.md`.

---

## 6. Files changed

| File | Change |
|------|--------|
| `backend/app/analysis.py` | `build_summary` rewritten to message-level window filtering; period metadata (`period_label`, `period_start/end`, `eligible_chats`, `analyzed_messages`, `undated_excluded`); explicit no-data result. PDF keys preserved. |
| `backend/app/models.py` | `AuditJob`: added `range_start`, `range_end`, `period_label`. |
| `backend/app/db.py` | Additive `ALTER TABLE audit_jobs ADD COLUMN IF NOT EXISTS …` (nullable; existing rows preserved). |
| `backend/app/schemas.py` | `AuditRequest`: added `period`, `start`, `end`. |
| `backend/app/main.py` | `submit_audit` computes the six windows at generation time (PKT→UTC) and stores bounds; audit list/detail expose `period_label`. |
| `backend/app/worker.py` | Passes the stored window (`range_start/range_end/period_label`) into `build_summary`; legacy jobs fall back to rolling hours. |
| `backend/app/reporting.py` | PDF header shows period + eligible/analyzed counts (layout otherwise unchanged). |
| `admin-web/index.html` | Reporting-window select → six options + custom date inputs. |
| `admin-web/admin.js` | Submits `period`/`start`/`end`; shows/hides custom dates; report history shows the period label. |
| `backend/tests/test_v51_audit_window.py` | **New** — message-level window + no-data acceptance tests. |

## 7. Acceptance checks (spec §7)

- ✅ All six filters available and produce the expected window.
- ✅ Analyzed messages match the selected window & employee (message-level, verified by test).
- ✅ Out-of-window messages never influence counts/AI/PDF.
- ✅ Empty window → clear no-data result, not an all-time report (verified by test).
- ✅ Gemini failure is transparently labelled, never disguised as a scored audit.
- ✅ Sync, voice/call, auth, PDF output, DB data unaffected (79 backend + 9 extension tests pass).

Re-verify:

```bash
cd "E:\DigiCon Valley\CSR\backend" && .venv\Scripts\python.exe -m pytest -q
```

---

## 7b. Dashboard vs PDF "conflict" explained + two follow-up fixes

Comparing the **Chats overview (Current month)** with **Audit-9 (Last 30 days)**:

- **Different windows.** "Current month" (Nov 1→now) ≠ "Last 30 days" (rolling ~Oct 18→now),
  so conversation/message/needs-review counts legitimately differ. **Fix:** added a **"Current
  month"** audit option so the audit can be generated for the exact same window as the dashboard.
- **The headline numbers are deterministic, not Gemini.** Conversations, messages, replied/
  no-reply, classifications, needs-review, voice/call counts are all rule-based. **Gemini only
  writes the QA narrative** (executive summary, lead tiers, Quality Framework). Audit-9 shows
  *"Gemini AI unavailable … AI evaluated 0/54"* because the key was removed — so those AI fields
  correctly read "Not assessed". To get real AI commentary, set `GEMINI_API_KEY` (or
  `AUDIT_AI_PROVIDER=claude` + `ANTHROPIC_API_KEY`). The counts are unaffected either way.
- **"Conversations 71" vs "Eligible chats 54"** also differ by definition: the dashboard counts
  chats *saved/updated* in range (conversation-level); the audit counts chats with ≥1 *message
  dated in the window* (message-level).
- **Potential Leads 2 (dashboard) vs 0 (PDF) — fixed.** The audit was re-deriving the category
  from in-window text only, which dropped a lead whose intent message was older than the window.
  Per spec §5.2 a lead is retained from full history, so `build_summary` now uses the stored
  conversation category (`Conversation.state`) and only falls back to text classification when no
  stored state exists. The audit's lead count now matches the dashboard.

**Does the auditor read voices?** **No.** It counts voice notes and known durations
(Audit-9: 66 received + 47 sent = 113, 921 s) but never transcribes or "reads" audio. The AI
analyzes **text only** (`ai_audit.py` system prompt: *"audio/call duration and media labels are
not transcripts"*). Voice content therefore never affects classification or QA scoring.

**Extra files changed in this pass:** `backend/app/analysis.py` (stored-category classification
in the audit), `backend/app/main.py` + `admin-web/index.html` ("Current month" audit option).
Backend **79 passed, 1 skipped**.

## 7c. "30 + 54 = 84 but total is 54?" and dashboard 71 vs audit 54

**Not a contradiction — they are different dimensions (spec §2).** In the audit:
- **54** = total eligible chats, and their **business category** = all 54 `unclassified`.
- **30** = the `needs_review` **flag**, which is an independent flag set ON TOP of the category.
  Those 30 are a **subset** of the 54, not 30 extra chats. So 30 and 54 must never be added;
  `30 + 54` is meaningless. (Correct reading: "54 chats, all unclassified, 30 of them also
  flagged for review.")

**Dashboard 71 vs audit 54 — now reconciled.** The dashboard was counting any conversation whose
`first_seen/last_seen` merely overlapped the month (conversation-level), while the audit counted
only chats with a message **dated** in the window (message-level). The audit's rule is the
spec-correct one (§3). I changed the dashboard's period membership to the **same message-level
rule**, so "Current month" on the dashboard and a "Current month" audit now report the same chat
set, needs-review count, and classification breakdown. *(`backend/app/main.py`
`/admin/chats/summary`)*

**Which was "correct"?** The **audit (message-level, 54)** — a chat belongs to the period only if
it actually has a message dated in it. The dashboard now matches it.

**Two more alignment fixes (so they are now identical):**
1. The audit (`build_summary`) was pre-filtering conversations by `last_seen_at/first_seen_at`,
   which can diverge from message dates and silently drop chats. It now selects conversations by
   the **exact same message-level predicate** as the dashboard.
2. The audit includes **every** chat with an in-window message **regardless of reply status** —
   "no reply" is reported as its own metric, never by removing a chat from the total.

**Verified on live data (Hammad, Current month):** both dashboard and audit now = **54 chats,
1040 messages, 30 needs-review**. (The old 71 was the seen-date-overlap count — 17 chats were
touched in November but had no message actually dated in November.) Backend **79 passed**.

## 8. Heads-up: two pre-existing Admin-UI test failures (from your manual edits)

Not caused by this work — they reflect code **you** changed today:

- `admin-web/tests/test-message-senders.cjs` — asserts the literal `area.append(renderMessage(msg,c))`,
  but you refactored it to attach `dataset.messageId` first (`admin.js:484`). Behavior is fine; the
  test string is stale.
- `admin-web/tests/test-all-time.cjs` — expects the analytics KPI to render `36`; this is in the
  analytics area you edited, unrelated to the audit.

Say the word and I'll update those two tests to match your new code (or look into the all-time one
if you think the number is wrong).
