-- READ ONLY. Run in pgAdmin connected to the CSR PostgreSQL database.
-- Explains why all-time total differs from current-month dated-message count.
-- Use local Karachi month boundaries (not database/server timezone).
WITH boundaries AS (
  SELECT
    date_trunc('month', now() AT TIME ZONE 'Asia/Karachi') AT TIME ZONE 'Asia/Karachi' AS month_start,
    (date_trunc('month', now() AT TIME ZONE 'Asia/Karachi') + interval '1 month') AT TIME ZONE 'Asia/Karachi' AS next_month_start
)
SELECT
  u.id AS internal_employee_id,
  u.full_name,
  u.employee_code,
  COUNT(*) AS all_saved_messages,
  COUNT(*) FILTER (
    WHERE m.occurred_at >= b.month_start AND m.occurred_at < b.next_month_start
  ) AS dated_messages_this_month,
  COUNT(*) FILTER (WHERE m.occurred_at IS NULL) AS event_date_missing,
  COUNT(*) FILTER (
    WHERE m.occurred_at IS NOT NULL
      AND (m.occurred_at < b.month_start OR m.occurred_at >= b.next_month_start)
  ) AS actual_message_date_outside_month,
  COUNT(*) FILTER (
    WHERE m.occurred_at IS NULL
      AND m.received_at >= b.month_start AND m.received_at < b.next_month_start
  ) AS undated_but_saved_this_month
FROM messages m
JOIN conversations c ON c.id=m.conversation_id
JOIN users u ON u.id=c.employee_id
CROSS JOIN boundaries b
WHERE u.role='employee'
GROUP BY u.id, u.full_name, u.employee_code
ORDER BY u.id;
