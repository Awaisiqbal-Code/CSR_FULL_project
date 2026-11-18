# CSR v4.7 — Voice Sender Direction / Async Playback

## Changes
- Voice note aur normal message mein outgoing direction ki stronger WhatsApp wrapper / source-ID detection.
- Jab stable source ID na ho to message-local right/left bubble alignment ka conservative fallback.
- Confirmed outgoing record ke liye sender ko `You` mark, backend Admin par employee ka registered name show karta hai.
- Uncertain direction ko timestamp load hone ke baad permanent DOM cache mein freeze nahi karte.
- Voice file retrieval/back-end unchanged: audio upload background mein chal sakti hai.

## Install
1. CSR aur PostgreSQL ka backup lo.
2. Existing `CSR/extension/content.js` ko updated version se replace karo.
3. Chrome chrome://extensions > CSR Reload; WhatsApp Web tab refresh karo.
4. Employee ka WhatsApp login active rakho; known outgoing/incoming voice ke saath fresh Sync Chats test karo.
5. Admin > Chats refresh, check outgoing voice RIGHT, incoming voice LEFT.

## Existing DB records
Already saved records with wrong sender direction **automatically repair nahi honge** when WhatsApp source ID missing; manual verification ya source-backed resync/update required hoga. Do NOT run DB reset merely for this patch. If a new sync shows the same wrong attribution, preserve the WhatsApp DOM's data-id/wrapper evidence for diagnosis.

## Important limitations
WhatsApp Web ka DOM unofficial, updates ke saath change hota hai. Exact geometry detection bhi imperfect ho sakti hai; conflicting source ID wins. No code can guarantee 100% correct speaker direction without authoritative message ID. Stored audio files unchanged.

## Source data verify
`VERIFY_V4_7_SENDER_READONLY.sql` pgAdmin mein run karne se Assam chat mein saved `from_me` aur WhatsApp ID evidence nazar aayegi. Ye data update nahi karti. Old voice already saved ho to woh automatically flip nahi hoti. Existing v4.5 install ho to pehle v4.6 SAFE PATCH apply karo, phir v4.7 extension content.js. V4.7 FULL ZIP mein v4.6 base included hai.
