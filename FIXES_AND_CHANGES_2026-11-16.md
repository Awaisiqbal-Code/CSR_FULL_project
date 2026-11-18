# Fixes & Changes — 2026-11-16

This document explains every change made, why it was made, and how each was verified.
It also contains an **important incident report** about your PostgreSQL database and
**exact recovery steps** you can run when you are ready.

---

## 1. Summary

The task was to "fix the errors" in the Scholarshiphive CSR project. I ran the existing
test suites to find concrete, reproducible errors and fixed the ones that were genuine
code/test defects.

| Area | Before | After |
|------|--------|-------|
| Extension tests (`extension-tests/*.cjs`) | 2 failing, 7 passing | **9 / 9 passing** |
| Backend tests (`backend/tests`) | 2 failing, 43 passing | **44 passing, 1 safely skipped** |

All fixes are verified (commands and results below). One change is a **data-safety guard**
that stops the test suite from ever again damaging your real database — see the incident
report in section 3, which you must read.

---

## 2. Code & test fixes

### 2.1 Extension `getRows` crashed when isolated — `__lovIsCallRow is not defined`
**File:** `extension/content.js` (function `_0x385460`, the row collector)

The call-row scanning loop called `__lovIsCallRow(candidate)` directly. In the live
extension this works (function declarations are hoisted), but the function became fragile:
any context where `__lovIsCallRow` isn't in scope throws a `ReferenceError` that aborts the
*entire* row collection — which is the step that feeds voice, call and text detection. The
`test-v48-mixed-voice.cjs` test reproduced this.

**Change** — made the call it defensive so a missing helper can never abort row collection:

```js
// before
if (__lovIsCallRow(candidate)) raw.push(candidate);
// after
if (typeof __lovIsCallRow === 'function' && __lovIsCallRow(candidate)) raw.push(candidate);
```

Behaviour in the real extension is unchanged; it is now crash-proof if the helper is ever
absent, and the mixed text+voice collection test passes.

### 2.2 Stale assertion in `test-v45-event-detection.cjs`
**File:** `extension-tests/test-v45-event-detection.cjs`

The test asserted the source still contained the old de-duplication line
`if (seen.has(canonical)) continue;`. The de-duplication was refactored into a stronger
form (`seenNodes` + `seenIds` + nested-ancestor check) in `getRows`, so the de-dup behaviour
still exists — only the literal string the test searched for had moved on.

**Change** — updated the assertion to match the current, behaviourally-equivalent de-dup code:

```js
assert(src.includes("if (!node || seenNodes.has(node)) continue;"),'DOM duplicates ignored');
```

### 2.3 Backend test teardown bug — "Cannot operate on a closed database"
**File:** `backend/tests/test_v45_sync_identity.py`

`eng.dispose()` was called **inside** the `with Session(eng) as d:` block. Disposing the
`StaticPool` closes the single in-memory SQLite connection, so when the `with` block then
exited and the session tried to roll back, SQLite raised
`sqlite3.ProgrammingError: Cannot operate on a closed database`. The dedup/sender assertions
themselves all passed — only the teardown ordering was wrong.

**Change** — wrapped the body in an outer `try/finally` so the engine is disposed **after**
the session closes. The backend dedup + sender-direction logic was correct and is untouched.

### 2.4 Destructive integration test had no real safety guard — **root cause of the incident**
**File:** `backend/tests/test_api.py`

See section 3 for the full story. The test reset the database with `Base.metadata.drop_all()`
but only validated the `TEST_DATABASE_URL` *environment variable* — not the actual engine the
test would drop. Because of Python import ordering, the shared engine can bind to the
**production** database, and the old guard never noticed.

**Change** — added a guard that checks the **live engine's bound database name** and refuses
to run (skips, never drops) unless it genuinely ends in `_test`, plus a graceful skip when the
dedicated test DB is unreachable:

```python
_bound=(engine.url.database or '')
if not _bound.endswith('_test'):
    pytest.skip('Refusing destructive tests: live engine is bound to %r, not a *_test database '
                '(likely an import-order collision with another test module).' % _bound,
                allow_module_level=True)
```

With this, the suite now reports `44 passed, 1 skipped` and **cannot** touch the real database.

---

## 3. ⚠️ Incident report — production database was reset by the test suite

**Please read this carefully.**

### What happened
While running `pytest` to surface errors, `tests/test_api.py::test_signup_incremental_...`
executed `Base.metadata.drop_all()` / `create_all()` against your **live
`scholarshiphive_csr` database** and then populated it with its own fixtures.

### Why (the mechanism)
- `app/db.py` builds its global `engine` the **first time any test imports it**, binding it to
  whatever `DATABASE_URL` is set at that moment.
- `tests/test_admin_chat_summary_api.py` imports `app.db` first (while reading your real
  `.env`), so the shared `engine` binds to the **production** `scholarshiphive_csr`.
- `tests/test_api.py` later imports the already-created `engine`, intending to use a dedicated
  `scholarshiphive_csr_test` database — but **that `_test` database does not exist on your
  server**, and the old guard only checked the env var, not the real engine. So `drop_all`
  landed on production.

### Current state of the live database (unchanged — I have NOT restored it)
| Table | Now | Was (per your report / backup) |
|-------|-----|-------------------------------|
| messages | **1** | ~694 (backup has 642 @ 3:10 PM) |
| voice_assets | **0** | 96 files on disk (backup has 34 rows) |
| conversations | **2** | 34 |
| users | **3** (test fixtures) | 4 |

### The good news
- **Your 96 voice audio files are intact** on disk at `backend/.csr_voice_private/` — only the
  database rows were affected, not the recordings.
- **A valid backup exists:** `scholarshiphive_csr.backup` in **both** your `Downloads` and
  `Desktop` folders (identical snapshot, PostgreSQL custom format, taken today ≈ 3:10 PM).
  It contains **642 messages, 34 voice records, 34 conversations, 4 users**.

### Recovery — run this when you are ready
The backup is a 3:10 PM snapshot, so it is a little behind tonight's latest sync (~694 msgs).
Restoring is still a large recovery from the current 1-message state, and the newer messages/
voice can be **re-synced from WhatsApp Web** with the extension afterward (that is the system's
normal job). You said you'd check for a newer backup first — if you find one dated later than
3:10 PM, use that file instead in the command below.

> **This command is destructive**: `--clean` drops the current tables before reloading. It
> replaces tonight's test-garbage rows with the backup's real data. Make sure the API and
> worker are stopped first. It will prompt for the `csr_app` password.

```bash
pg_restore --clean --if-exists --no-owner -h 127.0.0.1 -p 5432 -U csr_app -d scholarshiphive_csr "C:\Users\Muhammad Hammad\Downloads\scholarshiphive_csr.backup"
```

Then verify the counts came back:

```bash
psql -h 127.0.0.1 -p 5432 -U csr_app -d scholarshiphive_csr -c "select (select count(*) from messages) as messages, (select count(*) from voice_assets) as voice, (select count(*) from conversations) as conversations, (select count(*) from users) as users;"
```

(`pg_restore` / `psql` are at `C:\Program Files\PostgreSQL\18\bin\`.)

I'm happy to run the restore for you — just say the word and tell me which backup file to use.

---

## 4. Word-file regressions — live WhatsApp DOM investigation & fixes

I inspected the **live, logged-in WhatsApp Web DOM** (via the browser) to find the real
root causes behind the Word file's regressions, instead of guessing selectors. The key
discovery: **WhatsApp changed its DOM**, and the collector still relied on markers that no
longer exist. Evidence captured from a live chat with voice notes in both directions:

| What the collector looked for | Live reality (Nov 2026) |
|-------------------------------|-------------------------|
| `div.message-in` / `div.message-out` | **0 matches** — these classes are gone |
| `data-id` = `true_/false_<chat>@c.us_<hex>` | now a **bare hex id** (e.g. `ACE35E5AFAC83EB2A263D388FF64AC1A`) |
| `<audio>` element / `ptt-*` icons for voice | **0** — voice notes now use a `<canvas>` waveform + `aria-label="Play voice message"` |
| direction from class / id prefix | now encoded as `data-icon="tail-out"` (sent) / `"tail-in"` (received) **and** a per-row `aria-label` `"You:"` vs `"<Sender>:"` |
| IndexedDB message key | `false_<chat>@lid_<HEX>` (note `@lid`, not `@c.us`) |

### 4.1 Sender direction (Word file §5.3) — FIXED
**File:** `extension/content.js` → `__csrDirectionEvidence`

The function's first real signals (`.message-in/.message-out` classes, `true_/false_` id
prefix) all return nothing now, so every message fell through to the fragile
right/left **geometry** guess — the cause of the "wrong side" regression.

**Change** — added two reliable, higher-priority signals verified against the live DOM:
1. `data-icon="tail-out"` → outgoing, `data-icon="tail-in"` → incoming (language-independent;
   present on the first message of each run).
2. A per-row sender `aria-label`: `"You:"` → outgoing, `"<Sender>:"` → incoming. This is
   present on **every** message, including grouped ones with no tail. (Quoted replies expose
   only `"Quoted message"`, never a leaking `"You:"`, so the first sender-colon label is
   always the row's own — confirmed live.)

I validated this against **every** visible message in a real chat (text + voice, both
directions, grouped runs, a quoted reply) — all classified correctly. The old checks remain
as fallbacks and all extension direction tests still pass.

### 4.2 Message id / voice-media lookup (Word file §5.1, §5.5) — ROOT CAUSE FIXED
**File:** `extension/content.js` → `__csrTrustedMessageId`

Voice **bubble detection already works** (the `aria-label*="voice"` selector matches the new
canvas players — verified live). The real break is one step later: `__csrTrustedMessageId`
only accepted `true_/false_`-prefixed ids, so for the new **bare-hex** ids it returned an
empty string. With no source id, the backend/page has nothing to look the message up by, so
the voice media can never be downloaded or uploaded — matching the "Msg collection not found"
symptom (§5.5) and "fresh voice doesn't appear" (§5.1).

**Change** — accept the current bare uppercase-hex WhatsApp message id
(`/^[0-9A-F]{18,40}$/`) in addition to the legacy serialized form. The bare id matches the
`.id` field inside the IndexedDB record, so the existing media lookup can locate the message.
As a side benefit, de-duplication by `source_message_id` now works for current messages too
(it previously had no id to key on), which should also reduce the duplicate regression (§5.4).

### 4.3 Still needs a controlled live check (not yet confirmed end-to-end)
- **Fresh voice upload, end to end (§5.1):** the two fixes above remove the known blockers,
  but confirming an actual new `.ogg` uploads and plays requires one **controlled** sync with
  the rebuilt extension loaded (your data-safety rules say avoid repeated speculative syncs,
  so I did not trigger one).
- `extension/page-inject.js` `findMessage()` still locates media by a full IndexedDB cursor
  scan (up to 50 000 records) as a fallback. It works but is slow on large stores; a keyed
  lookup is a worthwhile follow-up once the above is confirmed.

> **To apply the extension fixes:** reload the unpacked extension in Chrome
> (`chrome://extensions` → reload), then do **one** controlled sync and check that new
> incoming/outgoing messages land on the correct side and a new voice note appears.

---

### 4.4 Duplicates & remaining direction-mix (Word file §5.3, §5.4)

Reported after the fixes went in: some duplicate messages and some still on the wrong side.
Read-only analysis of the live DB (1,678 messages) showed **why**, and it is tied to the
fingerprint design plus the restore+re-sync history.

**Root cause (prevention) — FIXED.** The backend de-duplicates text messages by a
`fingerprint = sha256(id · sender · timestamp · text · media · duration · from_me)`
([`backend/app/main.py`](backend/app/main.py)) and only honoured a *source id* for identity
when it matched the **legacy** `true_/false_` format. The new bare-hex ids were ignored, so:
- a re-sync, or a **direction correction** (my §4.1 fix flips `from_me`), changes the
  fingerprint → the backend inserts a **second row** for the same message = duplicate, and
- the pre-fix row keeps its old (wrong) side, so you see the message twice, once per side.

**Change** — `main.py` now treats the stable bare-hex message id as the identity key: if a
message with that id already exists in the conversation, it **updates `from_me`/`sender` in
place and never inserts a duplicate**. Verified by a new test
(`backend/tests/test_v49_barehex_dedup.py`): re-syncing the same ids with a corrected
direction yields `new_messages == 0`, no new rows, and the existing row's direction is updated.
From now on, syncs are self-correcting and won't pile up duplicates.

**Existing data (one-time cleanup) — NOT done yet, your decision.** The current DB mixes two
generations that don't share stable ids, so it can't be auto-cleaned without judgement:
- **644** rows from the restored 3:10 PM backup (empty source id, pre-fix direction), and
- **1,034** rows re-synced after the fixes (bare-hex id, correct direction).

They mostly don't match on exact content (the timestamp *text* drifted, e.g. `10:00 pm` vs
`10:00 PM`), and two legitimately identical messages (e.g. two “Ok” in the same minute) have
different real ids — so a blind content-based de-dup would risk deleting real messages. Voice
is safe to leave alone: **147 voice_assets, 0 orphans**, de-duped by id. Options:

1. **Leave the existing rows as-is** — prevention is fixed, so no *new* duplicates appear; the
   existing ones remain until you decide. Safest.
2. **Targeted cleanup with your approval** — I take a fresh backup first, then remove only the
   old pre-fix rows that have a confident corrected twin, preserving every voice link, and show
   you the exact list before deleting. (Per your data-safety rules, I will not delete anything
   without a fresh backup and your explicit go-ahead.)

### 4.5 Call events (Word file §5.2) — FIXED for calls that reach WhatsApp Web

Earlier I could find no call data at all in this account, which pointed to a platform limit.
That was because there simply were no recent calls. Once a **real call was placed in the
"Mom G" chat**, I inspected it live and found calls **do** render in-chat on current WhatsApp
Web — but with a completely different shape than the collector expected:

| What the collector looked for | Live reality of the call bubble |
|-------------------------------|--------------------------------|
| `data-testid="call-event"` / `call-log-message` | **absent** — it's an ordinary `conv-msg-<hex>` row |
| `data-icon="call-incoming/outgoing/missed"` | **absent** — no call `data-icon` at all |
| `data-pre-plain-text` (to pass its final gate) | **absent** — call events are system bubbles with none |
| direction via `message-in/out` class | **absent** |

The actual markers: text `"Voice call · Accepted on another device"`, a phone glyph exposed as
an **svg `aria-label`/`title` `ic-phone-callback-filled`** (not a `data-icon`), and a
`tail-in` direction icon. The old `__lovIsCallRow` bailed out at its "must have a call icon or
`data-pre-plain-text`" gate, so the call was never recognised.

**Changes (`extension/content.js`):**
1. `__lovIsCallRow` now also detects the call glyph by its `ic-(phone|video|call)…` aria-label/
   title, **and** recognises a genuine call event as *a single-bubble system row with no
   `data-pre-plain-text` whose text matches the call wording* (`Voice call`, `Missed voice
   call`, `Video call`, etc.). A real text message that merely mentions "voice call" always has
   `data-pre-plain-text`, so this does not misclassify chat text.
2. `__lovCallInfo` now derives call **direction** from the same reliable signals as messages —
   the `tail-out`/`tail-in` icon, then the `"You:"` sender aria-label — since the old
   call-direction icons and `message-in/out` classes are gone.

**Verified live:** the "Mom G" call row is now detected as a call (direction = incoming via
`tail-in`), with **zero false positives** across the other 21 messages in the chat. Duration is
captured when WhatsApp shows one (e.g. `5:23`); this particular event ("Accepted on another
device") has no duration, so none is recorded — matching "time + duration as available".

**Scope note:** this captures calls that **appear in WhatsApp Web** (placed/answered on Web, or
otherwise shown there). Calls that only ever exist on the phone and never surface in Web still
can't be read by a Web extension — that part remains a platform limitation. All call-marker
unit tests still pass.

## 5. How to re-verify everything

Extension tests:

```bash
cd "E:\DigiCon Valley\CSR" && for %t in (extension-tests\*.cjs) do node "%t"
```

Backend tests (uses the project venv):

```bash
cd "E:\DigiCon Valley\CSR\backend" && .venv\Scripts\python.exe -m pytest -q
```

Expected: all 9 extension tests print `PASS`; backend prints `45 passed, 1 skipped`.

---

## 6. Files changed

Test / safety fixes (§2):
- `extension/content.js` — defensive `typeof` guard in the row collector (§2.1)
- `extension-tests/test-v45-event-detection.cjs` — updated stale de-dup assertion (§2.2)
- `backend/tests/test_v45_sync_identity.py` — fixed engine-dispose ordering (§2.3)
- `backend/tests/test_api.py` — real data-safety guard on the destructive test (§2.4)

Live-DOM regression fixes (§4):
- `extension/content.js` → `__csrDirectionEvidence` — tail-icon + sender-aria-label
  direction detection (§4.1)
- `extension/content.js` → `__csrTrustedMessageId` — accept current bare-hex message ids (§4.2)
- `backend/app/main.py` — de-duplicate by the stable bare-hex message id and update direction
  in place instead of inserting a duplicate (§4.4)
- `backend/tests/test_v49_barehex_dedup.py` — new regression test for the above (§4.4)
- `extension/content.js` → `__lovIsCallRow` / `__lovCallInfo` — detect current call-event
  bubbles (glyph aria-label + no-`data-pre-plain-text` system row) and derive call direction
  from tail-icon / "You:" label (§4.5)

The database and the voice files on disk were **not** modified by these code changes.
The extension fixes take effect only after you reload the unpacked extension in Chrome.
