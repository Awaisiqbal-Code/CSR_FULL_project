# Audit & Management Analytics — Criteria and Thresholds

**Date:** 2026-11-18
**Spec:** *Scholarshiphive CSR — Audit & Management Analytics Implementation Requirements* (18 Nov 2026)
**Status you requested:** treat the spec as **approved**; where the document fixes a rule, it is
used as final; where it leaves a threshold open, I chose a sensible default and documented it here.

This file is the single source of truth for every criterion the new metrics use. All values live
as named constants in `backend/app/audit_metrics.py` (so they are easy to re-tune) and are applied
deterministically — counts/dates/durations never depend on AI. Nothing here changes the WhatsApp
extraction, stored data, auth, sync or existing terminology; all fields are additive.

> **Legend:** **[SPEC]** = taken directly from the document. **[CHOSEN]** = my default because the
> document did not give an exact threshold; change the named constant to re-tune.

---

## 1. Time windows and event attribution  [SPEC §2.2]

- **Filters:** Last 25 Hours, Last 7 Days, Last 15 Days, Last 30 Days, Previous Month, Custom
  Dates (and a single calendar day via custom start=end). *(already implemented 2026-11-17)*
- **Rolling filters** count **backward from the exact moment** the report is generated, not from
  midnight or last sync.
- **Previous Month** = the full previous local calendar month, **end-exclusive** (e.g. on 18 Nov:
  1 Oct 00:00 → 1 Nov 00:00 PKT).
- **Timezone:** default **Asia/Karachi**; local dates convert to UTC bounds for storage.
- **Event attribution:** every message/response/call belongs to its **actual event date**
  (`occurred_at`), never the sync day or PDF-creation day.
- **Window boundary:** `[start, end)` — start inclusive, end exclusive.
- **Conversation inclusion:** a conversation is in-period if it has **≥1 dated message in
  [start,end)**; older messages load only as context (used for "as-of-end" state, not counted as
  in-window activity).
- **As-of-end state:** reply state, new-lead and NNR facts are computed from history **up to the
  window end** so the report reflects the correct state at the cutoff.

## 2. Business category (one value per chat)  [SPEC §3.1]

Unchanged from the 17 Nov rules: **Potential Lead / Internal Staff / Unclassified**, exactly one.
A verified staff roster or an audited manual override beats AI keywords. A single generic keyword
never alone makes a lead. A later "Thanks" never erases an established Potential Lead (category is
read from the stored full-history `Conversation.state`).

## 3. Lead intensity tier  [CGPA bands SPEC (n8n) · point-model CHOSEN]

**Hybrid rule (`audit_metrics.lead_tier`), Potential Leads only:**

1. **CGPA present → original n8n bands are AUTHORITATIVE** (recovered from the
   `WCE_3` Gemini prompt in the n8n export). `extract_cgpa` reads an explicit CGPA
   from the conversation text (e.g. "cgpa 3.2", "gpa: 3.5", "3.4/4"); values above
   4.0 are rejected as impossible, not used.

   | CGPA (4.0 scale) | Tier |
   |---|---|
   | 3.7 and above | Very Hot |
   | 3.1 – 3.69 | Hot |
   | 2.6 – 3.09 | Average |
   | below 2.6 (or education-level mismatch) | Cold |

> **SUPERSEDED (Final Master Implementation Contract v2, 25 Nov 2026):** the engagement
> point model and the fifth "Close to Conversion" tier described below are **REMOVED**
> from all active audit paths. There are now **exactly four tiers** (Very Hot / Hot /
> Average / Cold), applied to **responsive leads only**. The **only deterministic** tier
> basis is an explicit CGPA (the bands above). A responsive lead with no CGPA is
> **Tier Pending Verification** (`tier=None`, `tier_assessment='PENDING_REVIEW'`) — never
> scored by activity. The optional AI judge may tier from broader qualification evidence.
> The historical point model is kept here only as a record of the retired approach.

2. ~~**No CGPA → the engagement point model below**~~ *(retired — see note above)*. Applied **only to Potential Leads**:

| Evidence | Points |
|---|---|
| A strong intent phrase present (admission, scholarship, student visa, offer letter, apply to, …) | **+2** |
| ≥2 distinct generic lead terms (university, ielts, toefl, cgpa, intake, degree, …) | **+1** |
| Inbound (customer) message count ≥5 | **+2** |
| Inbound message count 2–4 | **+1** |
| Two-way engagement (≥1 inbound **and** ≥1 outbound) | **+1** |
| Recent activity — last message within **3 days** of window end (`TIER_RECENT_DAYS`) | **+1** |
| Any voice note or call present in history | **+1** |
| A study destination (country) was identified | **+1** |

**Score → tier** *(retired)*:

| Tier | Score |
|---|---|
| ~~Close to Conversion~~ | ~~≥ 7~~ |
| Very Hot | 5–6 |
| Hot | 3–4 |
| Average | 1–2 |
| Cold | 0 |

A **stale Hot lead keeps its historical tier** and is surfaced via follow-up risk (reply state /
"Old Follow-up Awaiting"), never silently downgraded. *If management provides the approved
country-specific eligibility sheet, swap these constants for it — no other code changes.*

## 4. Conversation reply state  [SPEC §3.1 · boundary rule CHOSEN]

From the **latest actionable customer turn** (`audit_metrics.reply_state`):

| State | Rule |
|---|---|
| **Replied** | A counselor message exists **after** the customer's last message. |
| **Awaiting Counselor Reply** | Counselor replied earlier, but the **latest** customer message is unanswered. |
| **No Reply Observed** | Customer wrote, counselor **never** replied at all. |
| **No Action Required** | Counselor-only / system thread — no customer message. |
| **Unknown** | No dated history (insufficient capture). |

These are independent of business category and lead tier (a Potential Lead can be in any state).

## 5. Core metrics  [SPEC §4]

All are **COUNT DISTINCT conversations**, event-time, within the window, unless noted.

| Metric | Definition |
|---|---|
| **Active Conversations** (= Total Chats) | Distinct conversations with ≥1 eligible message in the window. |
| **Worked-on Chats** | Distinct conversations with ≥1 **outgoing** (counselor) message in the window. |
| **New Leads** | Conversations whose **first-ever message** is inbound **and** falls in the window, and whose category is not Internal Staff. |
| **New Lead Responded** | New Leads that received a first counselor reply (reply timestamp before window end). |
| **New Lead Awaiting Reply** | New Leads with **no** counselor reply by window end (counselor-accountability NNR). |
| **Follow-up Conversations** | Existing conversations (first-ever message **before** the window) with a counselor outgoing action in the window. |
| **Follow-up Touches** | Count of counselor outgoing messages in the window across follow-up conversations. |
| **Avg New-Lead First Response** | Mean seconds from the new lead's first inbound to the first counselor reply; sample size and missing pairs shown; N/A (never 0) when none. |
| **Avg Overall Response** | Mean of completed customer→counselor **turn pairs** (see §6), not a mean of per-chat averages. |

## 6. Response-pair calculation  [SPEC §4.1]

`audit_metrics.response_pairs`: consecutive **incoming** messages collapse into **one** turn; the
**first following outgoing** closes the pair; duration = outgoing − first-inbound-of-turn. Example
(spec A04/A05): 10:00 + 10:02 in, 10:07 reply → 7 min; 10:20 in, 10:32 reply → 12 min; overall
average 9 min 30 s, across 2 pairs. Invalid/negative pairs are excluded and reported, not zeroed.

## 7. New Lead No Response (NNR)  [SPEC §5 — two separate counters]

The spec deliberately keeps NNR limited to **new leads** and flags that "who failed to respond" was
not fully settled; it must be **two distinct counters, never merged**:

- **New Lead Awaiting Counselor Reply** — new lead, no counselor reply by end. *(counselor side)*
- **NNR · Awaiting Customer Response** — new lead the counselor **did** answer, but the customer has
  been silent for longer than the cutoff. *(customer side)*
  - **Cutoff `NNR_CUSTOMER_SILENCE_HOURS` = 24 hours [CHOSEN]** (spec calls it "a configurable
    cutoff" and gave no number).
- **Old Follow-up Awaiting** — existing follow-ups awaiting a reply are flagged **separately** and
  are **never** added into the new-lead NNR number.
- Unknown/unsynced/undated history is **never** counted as either party's failure.
- No conversation is labelled **Dead/Lost** from one day of silence (requires an explicit business
  outcome, which this deterministic pass does not invent).

## 8. Country identification  [SPEC §3.2 · keyword list CHOSEN]

`audit_metrics.extract_countries` scans verified conversation text with word-boundary regex. No
country is guessed from name, language or counselor. **Unknown** when there is no textual evidence.

- **Detected destinations (CHOSEN default list):** United Kingdom, United States, Canada,
  Australia, Germany, Italy, France, Ireland, New Zealand, Netherlands, Sweden, Finland, Denmark,
  Spain, Poland, Hungary, Austria, Turkey, Cyprus, Malaysia, China, UAE, Qatar. *(Keyword aliases
  per country are in `_COUNTRY_SOURCES`; extend as the business list grows.)*
- **Primary country** is set only when exactly one country leads in mentions (an explicit
  preference). A tie → no primary; the lead is reported as **multi-country**.
- **Counting:** a multi-country lead is counted **once per country** in the per-country view but
  **once** in the distinct global lead total (spec A15). **Multi-country** and **Unknown country**
  are exposed as their own counts.

## 9. Calls and voice  [SPEC §7]

- **Genuine call events only:** a call is counted when the message is a real call event
  (`media` contains `call`), **not** when text merely says "voice call" (spec A11).
- **Direction:** inbound vs outbound from message direction.
- **New-Lead vs Follow-up calls:** split by the conversation's lead status **at event time**.
- **Duration:** summed only when verified (> 0); unknown length is **N/A**, never defaulted to 0.
- **Voice notes:** sent/received counts and summed known durations; pending/failed playback status
  is kept separate from direction and reply state. *(unchanged from earlier work)*

### Channel response policy  [SPEC §7.2 / §12 — treated as approved, reported as BOTH]
- **Responded (Text / Voice)** — the per-channel figure: reply state = Replied.
- **Responded (All Channels)** — additionally credits an **outbound call** as a counselor touch.
- The two are shown **side by side and never merged**. Because WhatsApp Web does not expose a
  reliable "answered" flag, an outbound call is treated as a counselor **touch** in the all-channel
  view only; a missed/unknown call is **never** counted as a reply. *[CHOSEN interpretation of the
  "promote answered calls only after approval" clause: keep per-channel authoritative, add an
  all-channel view.]*

## 10. Follow-up / Hot-lead monitoring  [SPEC §6]

- Risk is surfaced through **reply state** and the **Old Follow-up Awaiting** count, plus each
  conversation's lead tier — not by a fixed "after 3 touches" rule (spec says 3 touches is
  guidance, not a closure rule).
- Full per-lead follow-up timeline tables, promised-next-contact dates and a due/overdue action
  queue require the new persistence tables in §9 of the spec (`followup_events`,
  `lead_state_history`), which are a schema-design item left for a separate approved migration (see
  §12). The current pass derives everything from message history without new tables, honoring the
  "never migrate/reset production" safeguard.

## 11. AI vs deterministic — the HYBRID model  [approved 2026-11-18]

The original n8n audit was **100% AI**: Gemini produced the categories, tiers, counts and narrative,
with count-consistency only *requested* in the prompt. That is why a missing/invalid key produced a
report with **0 leads**. We keep AI's richness but put it on a deterministic spine:

- **Deterministic owns every number and the business category** (potential_lead / internal_staff /
  unclassified), response times, NNR, country pipeline, reply state, calls, new/follow-up, and lead
  tiers (§3). These always reconcile and survive AI downtime. The report headline "Potential Leads"
  reads this count — never the AI category — so it always matches the Conversations data.
- **AI (Gemini now, Claude later) only enriches**: executive summary, per-chat QA (ten dimensions),
  next actions, data-quality flags, and a *separate* per-chat tier opinion (`audit_tier`). AI can
  **never** overwrite `lead_tier`, `lead_tiers`, `potential_leads` or any count.
- With no/invalid key, AI fields read "Not assessed" and deterministic totals stand (no fake zeros).

### AI configuration (required for the narrative layer)
`backend/.env`: `AI_ALLOWED=true`, `AUDIT_AI_PROVIDER=gemini`, a **valid** `GEMINI_API_KEY`
(from Google AI Studio), and a **real** `GEMINI_MODEL` (default now `gemini-2.5-flash`; the n8n value
`gemini-3.5-flash-lite` does not exist on the REST API and returns 404). The report's "Analysis mode"
line now shows the real failure cause — e.g. *API key rejected* (HTTP 401) or *model not found*
(HTTP 404) — so a bad key/model is obvious. Numbers are unaffected either way.

## 11b. Chat section — classification removed  [approved 2026-11-18]
To end duplication, lead classification now lives **only in the Audit report**. Removed from the
Admin UI: the Chats status filter, the per-chat/header/detail status chips, the Overview
"Conversation status" cards + "Status distribution" bars, and the "Conversation classification" /
"Chat classifications" pie-charts. Stored `Conversation.state` is untouched and still feeds the audit.

## 12. Deliberately NOT auto-implemented (needs your data/decision)

- **Lead-tier eligibility sheet** — using the §3 point model until you supply the approved
  country-specific criteria sheet; then only the constants in §3 change.
- **New persistence tables** (`lead_state_history`, `response_pairs`, `followup_events`,
  `audit_snapshots`, `sync_health`) and `rules_version`/`audit_snapshot_id` stamping — a schema
  migration requiring sign-off; current metrics are derived live instead.
- **Manual override + verified staff roster** storage — Internal Staff still comes from the stored
  category; a roster/override table is a future additive migration.
- **Voice transcription / content summary** — deferred by the spec pending consent & retention.
- **Deleted-message detection** — feasibility only; WhatsApp Web may not expose reliable deletions.

---

### Where each criterion lives in code
- Constants & logic: `backend/app/audit_metrics.py`
- Aggregation into the report: `backend/app/analysis.py` (`build_summary`)
- Report UI + drill-downs: `admin-web/admin.js` (`renderManagementAnalytics`, `renderAuditDrill`)
- PDF: `backend/app/reporting.py`
- Tests: `backend/tests/test_v52_management_metrics.py`,
  `backend/tests/test_v53_management_integration.py`,
  `admin-web/tests/test-management-ui-v412.cjs`
