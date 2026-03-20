-- Update the RPC function to prevent creating duplicate direct channels
CREATE OR REPLACE FUNCTION public.create_direct_channel(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_channel_id uuid;
  existing_channel_id uuid;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if a direct channel already exists with this specific user
  SELECT c.id INTO existing_channel_id
  FROM public.channels c
  JOIN public.channel_members cm1 ON c.id = cm1.channel_id
  JOIN public.channel_members cm2 ON c.id = cm2.channel_id
  WHERE c.type = 'direct'
    AND cm1.user_id = auth.uid()
    AND cm2.user_id = other_user_id
  LIMIT 1;

  -- If it exists, just return the existing channel ID!
  IF existing_channel_id IS NOT NULL THEN
    RETURN existing_channel_id;
  END IF;

  -- Insert the channel and get its ID
  INSERT INTO public.channels (type) 
  VALUES ('direct') 
  RETURNING id INTO new_channel_id;

  -- Insert both members into the channel
  INSERT INTO public.channel_members (channel_id, user_id, role) 
  VALUES 
    (new_channel_id, auth.uid(), 'member'),
    (new_channel_id, other_user_id, 'member');

  RETURN new_channel_id;
END;
$$;

-- Clean up any existing empty direct channels (caused by previous 403 errors where members weren't added)
DELETE FROM public.channels
WHERE type = 'direct'
  AND id NOT IN (
    SELECT channel_id FROM public.channel_members GROUP BY channel_id HAVING count(*) >= 2
  );

-- Clean up duplicate direct channels (keeping the oldest one)
WITH direct_pairs AS (
  SELECT c.id,
         cm1.user_id as user1,
         cm2.user_id as user2,
         c.created_at,
         ROW_NUMBER() OVER(
           PARTITION BY LEAST(cm1.user_id, cm2.user_id), GREATEST(cm1.user_id, cm2.user_id)
           ORDER BY c.created_at ASC
         ) as rn
  FROM public.channels c
  JOIN public.channel_members cm1 ON c.id = cm1.channel_id
  JOIN public.channel_members cm2 ON c.id = cm2.channel_id AND cm1.user_id != cm2.user_id
  WHERE c.type = 'direct'
)
DELETE FROM public.channels
WHERE id IN (
  SELECT id FROM direct_pairs WHERE rn > 1
);
