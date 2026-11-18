-- Read-only. Verify stored sender direction for an affected conversation.
-- Replace the WHERE chat name if testing another contact; no rows are changed.
SELECT m.id AS message_id,
       u.full_name AS employee,
       c.title AS chat,
       m.sender AS recorded_sender,
       m.from_me AS stored_outgoing,
       CASE
         WHEN m.source_message_id ILIKE 'true\_%' ESCAPE '\' THEN 'outgoing (WhatsApp ID)'
         WHEN m.source_message_id ILIKE 'false\_%' ESCAPE '\' THEN 'incoming (WhatsApp ID)'
         WHEN COALESCE(m.source_message_id,'') = '' THEN 'missing source ID'
         ELSE 'direction not encoded in source ID'
       END AS original_id_evidence,
       m.media,
       m.media_duration,
       m.timestamp AS source_timestamp,
       m.source_message_id
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
JOIN users u ON u.id = c.employee_id
WHERE u.full_name ILIKE '%Hammad%'
  AND c.title ILIKE '%Assam%'
ORDER BY m.id DESC
LIMIT 30;
