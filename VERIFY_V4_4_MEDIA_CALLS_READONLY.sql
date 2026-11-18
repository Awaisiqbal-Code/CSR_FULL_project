-- Read-only diagnostics. No tables/rows are changed.
-- Run on the intended CSR database in pgAdmin (all employees).
SELECT u.employee_code, u.full_name AS counselor, c.title AS chat,
       m.id AS message_id, m.sender, m.from_me,
       m.media, m.media_duration AS source_duration,
       m.timestamp AS source_time,
       (m.occurred_at AT TIME ZONE 'Asia/Karachi') AS event_time_pkt,
       CASE WHEN m.media IN ('voice','audio') THEN COALESCE(va.status,'missing_asset')
            ELSE 'call_metadata_only' END AS media_status,
       COALESCE(va.error,'') AS capture_error,
       CASE WHEN COALESCE(m.source_message_id,'')='' THEN 'source_id_missing'
            ELSE 'source_id_present' END AS source_id_status
FROM messages m
JOIN conversations c ON c.id=m.conversation_id
JOIN users u ON u.id=c.employee_id
LEFT JOIN voice_assets va ON va.message_id=m.id
WHERE LOWER(COALESCE(m.media,'')) IN ('voice','audio','call')
ORDER BY m.id DESC
LIMIT 150;

-- Repeated stable voice IDs are the only automatically provable duplicates.
SELECT c.employee_id, m.conversation_id, m.source_message_id,
       COUNT(*) AS duplicate_count
FROM messages m
JOIN conversations c ON c.id=m.conversation_id
WHERE LOWER(COALESCE(m.media,'')) IN ('voice','audio')
  AND COALESCE(m.source_message_id,'') <> ''
GROUP BY c.employee_id,m.conversation_id,m.source_message_id
HAVING COUNT(*)>1
ORDER BY duplicate_count DESC;
