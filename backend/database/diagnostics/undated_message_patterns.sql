-- READ ONLY. Run in pgAdmin. Shows employee-specific missing date patterns.
-- The output uses the DB internal user ID and employee public code separately.
SELECT u.id AS db_employee_id,
       u.employee_code AS public_code,
       u.full_name,
       CASE WHEN BTRIM(COALESCE(m.timestamp, '')) = '' THEN '[EMPTY]'
            ELSE m.timestamp END AS original_timestamp,
       m.time_quality,
       COUNT(*) AS messages,
       MIN(m.received_at AT TIME ZONE 'Asia/Karachi') AS first_saved_pkt,
       MAX(m.received_at AT TIME ZONE 'Asia/Karachi') AS last_saved_pkt
FROM messages m
JOIN conversations c ON c.id = m.conversation_id
JOIN users u ON u.id = c.employee_id
WHERE m.occurred_at IS NULL
GROUP BY 1, 2, 3, 4, 5
ORDER BY u.id, messages DESC, original_timestamp
LIMIT 500;
