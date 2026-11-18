-- Scholarshiphive CSR v4.6: READ-ONLY voice queue diagnostic.
-- Run in the same PostgreSQL database configured in backend/.env.
-- This statement never deletes, updates, or exports audio/message content.
SELECT
  u.full_name AS employee,
  c.title AS conversation,
  m.id AS message_id,
  (COALESCE(NULLIF(m.source_message_id,''),'') <> '') AS has_source_id,
  COALESCE(va.status,'no_asset') AS upload_status,
  COALESCE(va.attempts,0) AS attempts,
  COALESCE(va.error,'') AS last_error,
  COALESCE(va.byte_size,0) AS stored_bytes,
  va.updated_at AT TIME ZONE 'Asia/Karachi' AS last_attempt_pkt
FROM messages AS m
JOIN conversations AS c ON c.id = m.conversation_id
JOIN users AS u ON u.id = c.employee_id
LEFT JOIN voice_assets AS va ON va.message_id = m.id
WHERE LOWER(COALESCE(m.media,'')) IN ('voice','audio')
ORDER BY m.id DESC
LIMIT 100;
