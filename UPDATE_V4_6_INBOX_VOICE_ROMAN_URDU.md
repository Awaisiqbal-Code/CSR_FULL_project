# Scholarshiphive CSR v4.6 — Inbox order, sender direction, voice queue diagnostics

## Kya fix kiya gaya

1. **Inbox newest messages first:** Admin `/conversations` latest WhatsApp message `occurred_at` ke mutabiq order karta hai; jab kisi chat ke messages ki reliable dates nahi hotin to database `last_seen_at` fallback hai. WhatsApp ke pinned-chat placements ko exact recreate nahi kar sakte kyunke pin metadata store nahi hota.
2. **Sender/receiver fallback:** Original WhatsApp `true_`/`false_` message ID sab se strong evidence hai. ID na ho aur saved sender ka naam registered employee ke **exact** naam se match kare (contact title se different), to message outgoing/right-side infer ho sakta hai. Other uncertain messages ki direction invent nahi hoti aur unka diagnostic `stored_unverified` rehta hai. Isko text aur response metrics dono mein same tarah calculate karte hain.
3. **Contact identity:** Chat ke name ko pehle show karte hain aur known phone number ko separate secondary line mein show karte hain. Nonexistent phone invent nahi hota.
4. **Voice:** `Audio queued / pending` ka matlab voice placeholder DB mein hai, lekin actual backend audio bytes abhi nahi pohanchin. Employee extension login aur manual sync ke baad background alarm re-arm hota hai. Voice queue ka last status/error **Chrome local storage** mein `csr.voiceStatus` hota hai (diagnostics only). Backend mein already `voice_assets.status`, `attempts`, `error`, `byte_size` hain. Only `available` ka playback possible hai.

## Safe patch install (recommended)

1. CSR folder ka backup lo. Existing .env, Postgres DB, private voice storage ko touch mat karo.
2. FastAPI aur Worker terminals stop karo.
3. `Scholarshiphive_CSR_v4_6_INBOX_VOICE_SAFE_PATCH.zip` extract karo, files **exact paths** par copy/overwrite karo:
   - `backend/app/main.py`
   - `backend/app/chat_overview.py`
   - `backend/app/inbox_ordering.py` **(new file, mandatory)**
   - `admin-web/admin.js`
   - `admin-web/index.html`
   - `extension/background.js`
4. **Do not replace** `backend/.env`, database or employee extension `ui.js`/`popup.html`.
5. `START_API_LOCAL.bat` aur `START_WORKER_LOCAL.bat` run karo. Admin page `http://127.0.0.1:8000/admin` par Ctrl+Shift+R karo.
6. Chrome `chrome://extensions` mein CSR extension Reload karo; employee laptop par WhatsApp Web refresh karo. Employee logout/login kar ke voice alarm resume karna best hai.

## Testing

- Admin → Chats → employee Hammad select karo; latest saved message wali chat sab se pehle honi chahiye (agar original event date reliable ho).
- Chat open karo: `Hammad` sender ka unverified old ID wala message (agar sender exactly Hammad hai aur customer ka chat title alag) right side ho sakta hai. Actual WhatsApp ID aur stored direction disagree karen to WhatsApp ID win karegi. WhatsApp ke sent/customer messages sample se verify karo.
- Employee Chrome side panel mein Sync Chats press karo (Refresh Statistics nahi). WhatsApp Web login active rahe. Voice upload text sync se **separate** chalti hai. Ek minute baad Admin page refresh karo.
- Agar voice ab bhi pending/fail hai: `VOICE_STATUS_V4_6_READONLY.sql` pgAdmin Query Tool mein chalao aur **`upload_status`,`has_source_id`,`attempts`,`last_error`,`stored_bytes`** check karo. `pending` + `attempts=0` ka matlab upload try hi nahi hua; `retry/failed` aur error actual failure ka reason batayenge; `available` + bytes>0 hone par backend file path/playback check karo.
- Chrome mein `chrome://extensions` → CSR extension → **Service worker / Inspect** Console open karo. `CSR voice collection failed: ...` (agar hai) note karo. Worker/extension har error par text sync ko block nahi karenge.

## Important limitation

Voice ka actual file WhatsApp Web ki current DOM/in-memory/IndexedDB media availability par depend karta hai. `Audio pending` ko `Play` se replace kar dena fake success hoga. Browser/WhatsApp session band ho ya employee-login na ho to Admin laptop se media download nahi ho sakti. ZIP code audio bytes artificially generate nahi karta; actual playback ka end-to-end test employee WhatsApp session par pending hai.

**Database migration/reset required nahi.** Employee UI, 8-day first sync + incremental checkpoint, 15-minute auto-sync, unread handling aur saved PDFs unchanged. Tests: 44 Python tests passed, 3 integration tests skipped (local PostgreSQL driver/test DB unavailable); Node regression tests passed.
