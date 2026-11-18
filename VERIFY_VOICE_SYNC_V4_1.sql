-- Read-only. Run in pgAdmin after a fresh manual sync of a voice chat.
-- Compare media labels, source-message IDs and backend voice processing state.
SELECT u.full_name AS employee, c.title AS chat, m.id AS message_id,
       m.media, m.media_duration, m.timestamp,
       CASE WHEN NULLIF(m.source_message_id,'') IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS whatsapp_source_id,
       COALESCE(v.status, 'NOT_QUEUED') AS voice_upload_status,
       v.attempts, v.error
FROM messages m
JOIN conversations c ON m.conversation_id=c.id
JOIN users u ON c.employee_id=u.id
LEFT JOIN voice_assets v ON v.message_id=m.id
WHERE LOWER(c.title) LIKE '%hammad office%'
ORDER BY m.id DESC LIMIT 50;
