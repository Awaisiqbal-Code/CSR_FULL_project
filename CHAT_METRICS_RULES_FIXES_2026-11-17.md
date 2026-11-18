# Chat Metrics & Classification Rules — Corrections

**Date:** 2026-11-17
**Spec implemented:** *Scholarshiphive CSR — Chat Metrics & Classification Rules v1.0*
**Scope:** corrected the seven dashboard metrics — Average Response Time, Counselor Replied,
No Reply Observed, Needs Review, Potential Lead, Unclassified, Internal Staff — plus added
*Currently Awaiting Reply*. Voice/call/sender-direction detection, media playback, PDF audits,
employee auth, and stored data were **not** changed. Nothing destructive was run on the database.

All work is covered by tests: **54 backend tests pass, 1 skipped** (the skip is the destructive
integration test, which still refuses to touch a non-`_test` DB).

---

## 1. The core correction: three independent dimensions

The biggest rule error was that different *kinds* of information were being merged into one
"classification" value, so a Potential Lead that also needed review was counted only as
"Needs review" — hiding the lead and double-counting across overlapping buckets.

Per the spec, every conversation now carries **three independent values**:

| Dimension | Values | Where |
|-----------|--------|-------|
| **Business category** | `potential_lead` / `internal_staff` / `unclassified` | `Conversation.state` |
| **Reply status** | replied / awaiting_reply / no_reply_observed (computed) | analytics |
| **Review / data quality** | `needs_review` = true/false (independent flag) | `Conversation.needs_review` |

These are never summed together and never overwrite each other.

---

## 2. What changed, metric by metric

### Potential Lead (§5)
**Before:** any single keyword (e.g. "university", "apply", "ielts") flipped a chat to a lead.
**After:** a lead requires **contextual intent** — a strong intent phrase ("admission",
"scholarship", "study abroad", "apply to", "application fee", "eligibility", …) **or** at least
**two** distinct weaker lead terms together. A lone generic word no longer qualifies.
*(`backend/app/analysis.py` → `classify`)*

### Internal Staff (§5)
**Before:** guessed from generic work vocabulary ("verification code", "design credentials", …) —
a non-spec value `possible_internal`.
**After:** assigned **only** from a verified staff roster match (`staff_verified`) or an explicit
manual override (`manual_category`). Generic work words never make a chat "internal staff"; it
falls to `unclassified` instead. *(`classify`)*

### Unclassified (§5)
**After:** the honest default when evidence is insufficient — never treated as "not a lead" or
"rejected". It is one of the three mutually-exclusive categories.

### Needs Review (§2, §5.3)
**Before:** returned as if it were a business category (`classify` returned `'needs_review'`;
the dashboard did `name = 'needs_review' if review else category`), so it replaced the real
category and was summed alongside it.
**After:** `needs_review` is an **independent flag**. `classify` never returns it. The dashboard
reports a separate `needs_review` count, and a lead that needs review is still counted as a lead.
The classification pie shows only the three business categories; "Needs review" is its own card.
*(`analysis.py`, `backend/app/main.py`, `admin-web/admin.js`)*

### Average Response Time (§3)
The turn-based pairing in `backend/app/chat_overview.py` already matched the spec and is
preserved: consecutive customer messages before any reply form **one** open turn starting at the
first message; the first counselor reply closes it; later follow-ups don't create extra pairs;
durations use UTC `occurred_at` (never formatted strings); `avg = Σ durations ÷ completed pairs`;
`None` ("Not available") when there are no valid pairs. Verified by tests **T01/T02** (7 min; avg
9:30). No change needed beyond confirming and locking it with tests.

### Counselor Replied (§4)
**Clarified, not just counted.** Relabelled in the UI to **"Chats replied (period)"** = distinct
eligible chats with ≥1 completed customer→counselor pair in the range. The label now states this
is **historical**, not proof the latest question is answered.

### No Reply Observed (§4)
Kept as "chats with an actionable incoming turn and **no** observed reply in available history",
and the label now notes it is *not* a proven SLA violation.

### Currently Awaiting Reply (§4, new)
**Added.** Counts conversations whose **latest** customer turn has no later reply — even if the
counselor replied earlier. Computed as `no_reply_observed + chats_with_pending_reply`. This is a
current-state metric and **intentionally overlaps** "No reply observed"; it is shown as its own
card and never summed with "Chats replied". Verified by test **T03** (replied=1 and awaiting=1 at
once — not a contradiction). *(`chat_overview.py`, `admin.js`)*

---

## 3. Files changed

| File | Change |
|------|--------|
| `backend/app/analysis.py` | `classify` rewritten to 3-dimension, context-aware, category-only (never returns needs_review); `build_summary` counts needs_review independently and reconciles only the three categories. PDF/worker output keys preserved. |
| `backend/app/main.py` | Sync sets `Conversation.state` from the category alone (independent of review); the `/admin/chats/summary` endpoint reports `classifications` (3 categories) and `needs_review` **separately**. |
| `backend/app/chat_overview.py` | Added `currently_awaiting_reply`; existing response-time keys unchanged. |
| `admin-web/admin.js` | Labels: "Chats replied (period)", new "Currently awaiting reply" card, "Needs review" now reads the independent flag; classification pie shows only the three categories; `internal_staff` labelled and filterable. |
| `backend/tests/test_v50_metrics_rules.py` | **New** acceptance tests (below). |

No changes to the extension, voice/call detection, media storage, PDF generation, or auth.

---

## 4. Acceptance tests (spec §8)

`backend/tests/test_v50_metrics_rules.py` — all passing:

| ID | Scenario | Result |
|----|----------|--------|
| T01 | Incoming 10:00 + 10:02, reply 10:07 | one turn, 7-min response |
| T02 | + incoming 10:20, reply 10:32 | two durations, avg 9:30 |
| T03 | replied earlier, latest question unanswered | replied(period)=1 **and** awaiting=1; no_reply_observed=0 |
| — | incoming only, never answered | no_reply_observed=1, awaiting=1, avg=None |
| T06 | "university website update" | `unclassified` (not a lead; staff only if verified) |
| T07 | "can you help me apply to Germany?" | `potential_lead` from context |
| T08 | lead then "Thanks" | `potential_lead` retained |
| — | verified staff / manual override | `internal_staff` |
| — | needs_review set | category unchanged (dimension independence) |

Re-verify everything:

```bash
cd "E:\DigiCon Valley\CSR\backend" && .venv\Scripts\python.exe -m pytest -q
```

Expected: `54 passed, 1 skipped`.

---

## 5. Notes & remaining follow-ups (from the spec, not done here)

- **Manual override / staff roster storage.** `classify` already accepts `manual_category` and
  `staff_verified`, but there is no admin UI/table yet to set them. Wiring a stored override
  (with actor + reason + timestamp, surviving re-sync per §5.2) is the natural next step.
- **Response-pair persistence (§6.1).** Pairs are computed on read, not stored. Persisting them
  (with `calculated_version`) would allow historical snapshots and faster dashboards.
- **Business-hours SLA (§3.4)** is not implemented; elapsed clock time is used, as the spec
  allows by default.
- **Existing duplicate rows** from the earlier restore+re-sync are unchanged; cleanup remains a
  separate, backup-first, approval-gated operation (see `FIXES_AND_CHANGES_2026-11-16.md`).
