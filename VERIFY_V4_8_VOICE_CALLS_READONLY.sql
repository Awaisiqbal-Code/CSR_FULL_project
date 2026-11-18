-- Scholarshiphive CSR v4.8 verification (READ ONLY).
-- Run in pgAdmin on the same database used by FastAPI.
-- Do NOT include passwords or message text when sharing results.

-- 1) Saved message types, voice and call coverage by employee.
SELECT
    u.id AS employee_db_id,
    u.full_name AS employee,
    COUNT(m.id) FILTER (WHERE LOWER(COALESCE(m.media,'')) IN ('voice','audio')) AS voice_records,
    COUNT(m.id) FILTER (WHERE LOWER(COALESCE(m.media,'')) = 'call') AS chat_call_events,
    COUNT(m.id) FILTER (WHERE LOWER(COALESCE(m.media,'')) = 'image') AS image_placeholders,
    COUNT(m.id) FILTER (WHERE LOWER(COALESCE(m.media,'')) NOT IN ('voice','audio','call','image')) AS other_messages,
    COUNT(m.id) FILTER (WHERE LOWER(COALESCE(m.media,'')) IN ('voice','audio') AND COALESCE(m.source_message_id,'') = '') AS voice_without_source_id
FROM users u
LEFT JOIN conversations c ON c.employee_id = u.id
LEFT JOIN messages m ON m.conversation_id = c.id
WHERE u.role = 'employee'
GROUP BY u.id, u.full_name
ORDER BY u.id;

-- 2) Audio upload statuses. 'available' is required for Admin playback.
SELECT
    u.id AS employee_db_id,
    u.full_name AS employee,
    COALESCE(v.status,'(no voice asset)') AS voice_status,
    COUNT(*) AS records,
    SUM(COALESCE(v.byte_size,0)) AS stored_bytes
FROM voice_assets v
JOIN messages m ON m.id = v.message_id
JOIN conversations c ON c.id = m.conversation_id
JOIN users u ON u.id = c.employee_id
GROUP BY u.id, u.full_name, v.status
ORDER BY u.id, voice_status;

-- 3) Recent voice status without exposing the actual chat text or contacts.
SELECT
    u.id AS employee_db_id,
    m.id AS message_db_id,
    m.occurred_at AT TIME ZONE 'Asia/Karachi' AS event_time_pkt,
    CASE WHEN COALESCE(m.source_message_id,'') <> '' THEN 'yes' ELSE 'no' END AS source_id_present,
    v.status, v.attempts, COALESCE(v.error,'') AS upload_error
FROM voice_assets v
JOIN messages m ON m.id = v.message_id
JOIN conversations c ON c.id = m.conversation_id
JOIN users u ON u.id = c.employee_id
ORDER BY m.id DESC LIMIT 30;
