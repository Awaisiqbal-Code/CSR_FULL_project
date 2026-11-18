# Scholarshiphive CSR v4.5 — Sync Quality Fix + Clean Re-Sync

## Kya change hua

- Normal text, image, voice ke asli WhatsApp `true_` / `false_` message IDs backend tak forward honge (jahaan DOM mein available hon). Sender direction source ID se verify hogi; Admin left/right display existing logic use karega.
- WhatsApp ke nested DOM message wrappers ke duplicates avoid honge. Same confirmed source message ID ki repeat sync nayi row nahin banayegi. Sirf same duration/time ki doosri genuine voice ko merge nahin karega.
- False/group call detection stricter hai. Sirf WhatsApp ke clearly recognizable call events count honge; generic call buttons, group headings, ya normal messages ko call na samjhe. Events jinki identity/duration nahin mili unki details invent nahin hongi.
- Voice playback resolver ne active WhatsApp chat mein real loaded `<audio>` source ka safe fallback add kiya hai. Ye source available honay par madad karega; WhatsApp Web har voice audio expose nahin karta aur 4 MiB upload limit barkarar hai.
- Employee UI, 8-day first sync, 15-min automatic sync, backend PDF/audit worker, existing theme unchanged. No new DB schema migration.

## PART A: Code install

1. **Poore `CSR` project aur PostgreSQL ka backup**. Existing folder ki copy bana lo.
2. Backend/Worker stop; Chrome Extension temporarily disable.
3. `Scholarshiphive_CSR_v4_5_SYNC_QUALITY_SAFE_PATCH.zip` extract karo.
4. Matching folder paths mein overwrite karo:
   - `extension/content.js`
   - `extension/page-inject.js`
   - `extension/manifest.json`
   - `backend/app/main.py`
   Extension/Backend automated tests optional hain. `backend/.env` unchanged rakho.
5. Backend aur Worker dobara run karna reset ke BAAD; pehle Part B karo.

## PART B: Fresh test database reset (DESTRUCTIVE)

1. Sirf **local TEST data** par run karo. Partner/employees ke extensions jo is DB ko sync karte hain unhein bhi disable karo. Backend/Worker band hon.
2. pgAdmin: `scholarshiphive_csr` right click → Backup → Custom (.backup), verify success.
3. pgAdmin Query Tool mein project root ki `CSR_v4_5_CLEAN_RESYNC_RESET.sql` file open karke execute karo. *Ye all employees ki chats, messages, voice metadata, sync runs/checkpoints aur audit PDFs permanently delete karegi.* `users` table nahin delete hogi.
4. 7 tables ke counts `0` hon; users/employees still available hon.
5. **Optional orphaned private audio cleanup (sirf confirmed test data ke liye)**: FastAPI band kar ke `backend/.csr_voice_private` ki copy/backup ke baad us folder ki OLD audio files manually delete kar sakte ho. SQL files on disk nahin delete karti. `CSR_VOICE_STORAGE_DIR` custom environment path use kar rahe ho to usko check karo.
6. Backend/Worker restart karo. Chrome `chrome://extensions` par Employee Extension version `3.0.2` reload, WhatsApp Web hard refresh.
7. Employee login → **Sync Chats**. Fresh sync last 8 rolling days se chalegi; text-save complete hone ke baad voice background queue separately work karegi. WhatsApp Web session active rakho.
8. Admin → Chats: Hammad/Abdullah ke known incoming/outgoing texts check karo; target group mein false call na ho; real voice ID duplicate na ho; `voice_assets` status dekho.
9. Second Sync click karke verify karo ke same message count double nahin hota. Next sync incremental checkpoint se chalegi.

**Avoid:** accounts delete, .env replace, DB role drop, `SETUP_LOCAL.bat` run, archived project copy paste over DB, unverified voice rows delete.

## Real WhatsApp limitations

- Chat/voice/source IDs WhatsApp Web ke DOM/server ki availability par depend karte hain; static tests live success guarantee nahin karte.
- Some voice files download nahin hotin (`source_missing`, `failed`, `retry`) despite recognized placeholders; admin Play sirf `available` audio par chalega. Playback test ke liye WhatsApp Web mein specific voice ko load/play karke next voice retry allow karna useful ho sakta hai, lekin result guaranteed nahin.
- Real call durations sirf original event metadata available honay par show hongi; call recordings collect nahi hotin.
- 8-day new reset ka cutoff ab **reset ke waqt** calculate hoga; purane 8-day window ki sari chats wapas aana guaranteed nahin.

## Read-only verification SQL

```sql
SELECT c.title, m.id, m.sender, m.from_me, m.media,
       m.source_message_id, m.timestamp, m.media_duration,
       va.status AS voice_status, va.error AS voice_error
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
LEFT JOIN voice_assets va ON va.message_id = m.id
WHERE LOWER(c.title) LIKE '%papa%' OR LOWER(c.title) LIKE '%assam%'
ORDER BY c.title, m.id DESC
LIMIT 100;
```

Tests from our environment: Python `42 passed` (`3 skipped` when PostgreSQL driver/test DB unavailable); JavaScript regression tests pass. Actual real WhatsApp Web voice/download testing pending.
