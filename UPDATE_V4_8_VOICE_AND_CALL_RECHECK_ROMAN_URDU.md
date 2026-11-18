# Scholarshiphive CSR v4.8 — Voice Recovery + Chat Call Event Hotfix

## Source of the issues

- Latest WhatsApp Web mixes `message-in/message-out` and `msg-container`-only bubbles within one chat. Old collector had an all-or-nothing fallback, so new audio-only wrappers could be invisible while texts were extracted.
- Incremental sync rechecked only five minutes before the last successful checkpoint. If WhatsApp audio arrived/hydrated late, a later sync skipped it.
- A voice note previously saved as an empty image placeholder was skipped by duplicate-ID suppression, even after its correct type became visible.
- Conversation-call event detection was narrow; it now accepts several clearly worded event bubbles with timestamps while rejecting generic chat/header call icons.

## Install safely on Windows

1. **Back up** `CSR` project folder and PostgreSQL before replacing backend files.
2. Stop `START_API_LOCAL.bat` and `START_WORKER_LOCAL.bat` terminals.
3. Extract **v4.8 SAFE PATCH** and copy matching files into your existing `CSR` folder:
   - `extension/content.js`
   - `extension/manifest.json`
   - `backend/app/main.py`
   - `backend/app/sync_windows.py`
   - `backend/app/media_recovery.py` (new file)
4. Preserve your own `backend/.env`; this patch does not require DB migration or reset.
5. Start API + worker. Open `chrome://extensions` and Reload your CSR extension. Refresh WhatsApp Web.
6. On the **employee** browser, open the chat with fresh voice notes and press **Sync Chats**. Keep WhatsApp Web and Chrome active for background audio collection.
7. Refresh Admin Conversations. A voice can first show `pending` and later `available`/Play. Text sync success does **not** mean every voice has already uploaded.
8. If a voice remains missing or unavailable, run `VERIFY_V4_8_VOICE_CALLS_READONLY.sql` and check whether it was *detected* (`voice_records`), *queued* (`pending`), or *saved* (`available`).

## What changed

- Collection of mixed message wrappers instead of using one DOM type as an all-or-nothing fallback.
- Narrow voice-player metadata matching and source ID conservation.
- 90-minute incremental **recheck** instead of 5 minutes; first sync is still exactly eight days. Already saved message IDs are deduplicated.
- Carefully promotes only a **verified matching WhatsApp source ID** with an empty image placeholder into a voice record. Does not change arbitrary texts or documents.
- More strict chat call-event variant recognition; **not** a full WhatsApp Calls-tab history collector.

## Important limitations

- The 90-minute recheck increases work per incremental sync. Watch large chats for performance; it is deliberately bounded rather than repeating eight days each time.
- Voice audio can only be played after the actual file reaches private storage. Browser-side WhatsApp access and valid message IDs are needed; retries can fail.
- WhatsApp has a **dedicated Calls tab** with call history. This release detects additional **conversation-local call events only**. A dashboard value of 0 does not establish that there were no WhatsApp calls. Full Calls-tab capture requires a separate authorized collector, to be tested against the actual UI and its data availability.
- WhatsApp's internal HTML is unofficial and may change. Test on your account before any live business use.
- Do **not** clear your restored PostgreSQL; playback working for older voices proves some files are already saved.

## Validation

- 45 Python tests passed, 3 skipped (environment/integration prerequisites).
- Extension and Admin JavaScript tests passed, including new mixed-wrapper and strict-call tests.
- Local authenticated WhatsApp live integration still pending.
