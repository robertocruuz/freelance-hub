CREATE OR REPLACE FUNCTION get_unread_counts(p_user_id uuid)
RETURNS TABLE (channel_id uuid, unread_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT m.channel_id, COUNT(*)
  FROM messages m
  JOIN channel_members cm ON m.channel_id = cm.channel_id AND cm.user_id = p_user_id
  WHERE m.created_at > COALESCE(cm.last_read_at, '1970-01-01'::timestamptz)
    AND m.user_id != p_user_id
  GROUP BY m.channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
