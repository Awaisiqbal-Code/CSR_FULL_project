# Audit Section — Clickable Drill-Down + Spec Review

**Date:** 2026-11-18
**Spec:** *Scholarshiphive CSR — Audit & Management Analytics Implementation Requirements* (18 Nov 2026)
**Your request:** every feature / box / card on the audit section must be **clickable after a
report is generated**, and clicking shows **only that metric's respective details** — without
changing the previously working terminologies.

**Guarantee honored:** no change to the WhatsApp extension, collector, voice/call/media capture,
employee/admin auth, sync, the PDF layout, stored data, or any existing label/terminology. No
database reset, truncate or migration. Every number still comes from the same deterministic
rules; the AI layer is untouched.

**Tests:** backend **79 passed, 1 skipped**. Audit front-end tests **3/3 pass** (preview v4.11,
AI intelligence v4.13, and the **new drill-down v4.12** test). See §5 for the 5 pre-existing
front-end failures that are unrelated to this change.

---

## 1. What "clickable with drill-down" now does

After a report is generated and opened in the audit viewer, **every quantified box is a button**
that opens a drill-down panel listing **only the conversations behind that number**, with their
saved evidence. Clicking a different card replaces the panel; a **Close ✕** button dismisses it.
This is the §2.1 requirement: *"Admin can click a category → … → conversation to inspect
underlying saved messages, timestamps, media/call evidence."*

**Cards that are now clickable** (labels unchanged):

| Section | Cards made clickable |
|---|---|
| Summary stat grid (deterministic) | Total Chats, Potential Leads, Needs Review, Internal / Staff, Unclassified |
| Summary stat grid (AI audit path) | Total Chats, Responsive Leads, Consultant No-Reply, Dead Chats, Internal / Staff, Empty Threads, Unclassified, Needs Review |
| Lead Pipeline — Retained Tiers | Very Hot, Hot, Average, Cold (each tier tile) |
| Voice, Calls & Response Evidence | Voice Received, Voice Sent, Known Voice Seconds, Call Events, Possible No Reply, Possible Dead Chats |

A card is only turned into a button when it actually has matching conversations; a count of **0**
stays a plain tile (nothing to drill into). **Unread Excluded** stays non-clickable on purpose —
it is a sync-snapshot count with no per-conversation message basis, so there is nothing to list
(it would be misleading to fabricate rows for it).

**The drill-down panel shows, per matching conversation:** title, effective business category,
lead tier, reply state (Awaiting counselor reply / No inbound reply / —), voice in/out counts and
known seconds, call events, and flags (Needs review + reason, AI status/reason when present).
Only conversations that belong to the clicked metric are shown — nothing else.

Each metric filters the **same** `summary.conversations` set the report was built from, so a
drill-down can never disagree with the headline number it came from.

## 2. Independent dimensions preserved (spec §3.1)

Drill-down predicates respect the three independent dimensions and never conflate them:

- **Business category** (Potential Lead / Internal Staff / Unclassified, or the AI path's
  responsive / consultant_no_reply / dead / empty) — one value per chat.
- **Reply state** — shown as its own column, never merged into the category.
- **Needs Review** — an independent flag; the "Needs Review" card lists every flagged chat
  regardless of its category, exactly as the count is computed. Review flags are never summed into
  the category total.

## 3. Files changed

| File | Change |
|------|--------|
| `backend/app/analysis.py` | `build_summary` now also records **per-conversation** `voice_sent`, `voice_received`, `voice_seconds`, `call_events` on each row (additive; the window/global totals are unchanged). This lets the Voice/Call evidence cards drill down to the exact chats behind them. The AI layer already carries these through (`dict(r, …)` in `audit_intelligence.evaluate_conversations`). |
| `admin-web/admin.js` | `auditStat()` builds a clickable button (with a "View details ›" cue) when a metric has matching conversations; new `renderAuditDrill()` renders the filtered detail table into a dedicated `#audit-drill` panel. Stat grid, lead-tier tiles and the evidence grid now pass per-metric predicates. A one-line hint tells the admin the boxes are clickable. No labels/terminology changed. |
| `admin-web/styles.css` | Styles for `.audit-stat-clickable` (hover/focus/active), the "View details ›" cue, clickable tier tiles, and the `.audit-drill` panel. Light-theme only, matching the existing report styling. |
| `admin-web/index.html` | Asset version bumped `?v=4.11` → `?v=4.12` for `styles.css` and `admin.js` so browsers load the updated files. |
| `admin-web/tests/test-audit-drill-v412.cjs` | **New** — mounts a mixed conversation set, renders the report, clicks each kind of card and asserts the drill-down lists **only** the matching conversations (Needs Review → only the flagged chat + its reason; Call Events → only the chat with a call; Total → all; etc.). Pure mock DOM; no backend/DB/WhatsApp. |
| `admin-web/tests/test-audit-preview-v411.cjs`, `test-audit-intelligence-v413.cjs` | Version pin updated `4.11` → `4.12` to match the asset bump (their real assertions still pass). |

## 4. How to see it

1. Reload the Admin portal (hard refresh so `?v=4.12` loads).
2. Open **Audit reports** → open any completed report.
3. Any box with a blue outline and a **"View details ›"** cue is clickable. Click it — a panel
   opens directly under the summary showing only that metric's conversations and evidence. Click
   another card to switch, or **Close ✕** to dismiss.

## 5. Pre-existing front-end test failures (NOT caused by this change)

Five `admin-web/tests/*.cjs` were already failing before this work and still are:

- `test-chat-workspace.cjs`, `test-count-clarity.cjs`, `test-summary-first.cjs` — each pins the
  asset version to the long-stale `?v=3.9` (the app was already at `4.11` before today). They fail
  on that line before reaching any logic.
- `test-all-time.cjs` (expects analytics KPI `36`) and `test-message-senders.cjs` (asserts an old
  `admin.js` string) — the two stale tests from your earlier manual edits, noted previously.

I left these untouched because they predate this change and their staleness is unrelated to the
drill-down. Say the word and I'll refresh their version pins / assertions to match the current
code so the whole suite is green again.

## 6. What this change deliberately did NOT do (from the 18 Nov spec)

The 18 Nov document is a large specification; most of it is explicitly marked **[MEETING]**,
**[DESIGN]** or **[APPROVAL]** and listed under *"Deliberately separate / not yet approved"* or
*"Decisions requiring management confirmation"* (§12). Those are **not implemented here** because
the spec itself says they need an approved eligibility/criteria sheet or a management decision
first, and because implementing them would add or rename terminology — which you asked me not to
do. In particular, still pending your approval:

- **New Leads / New-Lead First Response / Follow-up metrics** (§4) and the **NNR** view (§5) —
  §12 says management must first confirm whether NNR means counselor non-response, customer
  non-response, or two separate counters.
- **Lead intensity tiers** (Very Hot / Hot / Close-to-Conversion thresholds) and **country-wise
  pipeline** (§3.2, §6) — require the approved country-specific criteria spreadsheet.
- **Merging answered calls into "responded"** (§7.2) and the all-channel vs per-channel response
  split — spec says keep calls separate until the call-outcome rule is approved.
- **New data-contract tables** (`lead_state_history`, `response_pairs`, `followup_events`, …, §9)
  and `audit_snapshot_id` / `rules_version` stamping (§1) — a schema design that needs sign-off.

These are ready to pick up individually once the corresponding management decisions in §12 are
made. The current change delivers the one fully-specified, approval-free item you asked for: the
clickable, drill-down audit report.
