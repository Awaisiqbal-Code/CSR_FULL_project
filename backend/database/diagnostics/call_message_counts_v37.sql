-- READ ONLY. Compare the same employee in All Time and November 2026, PKT.
-- Call rows remain stored: do not delete or guess their event time.
SELECT
  u.full_name AS employee,
  COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(m.media, ''))) <> 'call') AS saved_messages_all_time,
  COUNT(*) FILTER (
    WHERE LOWER(TRIM(COALESCE(m.media, ''))) <> 'call'
      AND m.occurred_at >= TIMESTAMPTZ '2026-11-01 00:00:00+05'
      AND m.occurred_at < TIMESTAMPTZ '2026-12-01 00:00:00+05'
  ) AS dated_messages_november,
  COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(m.media, ''))) = 'call') AS saved_call_placeholders,
  COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(m.media, ''))) = 'call'
    AND m.occurred_at IS NULL) AS call_placeholders_missing_date,
  COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(m.media, ''))) <> 'call'
    AND m.occurred_at IS NULL) AS non_call_messages_missing_date,
  COUNT(*) AS all_raw_records
FROM messages m
JOIN conversations c ON c.id=m.conversation_id
JOIN users u ON u.id=c.employee_id
WHERE u.role='employee'
GROUP BY u.id,u.full_name
ORDER BY u.id;

-- Possible repeated placeholders to investigate: NOT proven duplicates.
-- Distinct call events without usable event timestamps can have identical metadata.
SELECT u.full_name, c.title, m.sender, m.from_me, m.media_duration,
  COUNT(*) AS same_metadata_call_rows,
  ARRAY_AGG(m.id ORDER BY m.id) AS message_ids
FROM messages m
JOIN conversations c ON c.id=m.conversation_id
JOIN users u ON u.id=c.employee_id
WHERE LOWER(TRIM(COALESCE(m.media, '')))='call'
  AND m.occurred_at IS NULL
GROUP BY u.full_name, c.id, c.title, m.sender, m.from_me, m.media_duration
HAVING COUNT(*) > 1;
