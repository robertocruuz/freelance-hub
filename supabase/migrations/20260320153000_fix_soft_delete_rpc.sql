-- Fix: Do not NULLify hidden_at when an existing channel is reused
-- This preserves the "Clear Chat" history boundary.

CREATE OR REPLACE FUNCTION public.create_direct_channel(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_channel_id uuid;
  existing_channel_id uuid;
BEGIN
  -- Check if a direct channel already exists with this specific user
  SELECT c.id INTO existing_channel_id
  FROM public.channels c
  JOIN public.channel_members cm1 ON c.id = cm1.channel_id
  JOIN public.channel_members cm2 ON c.id = cm2.channel_id
  WHERE c.type = 'direct' 
  AND cm1.user_id = auth.uid() 
  AND cm2.user_id = other_user_id;

  IF existing_channel_id IS NOT NULL THEN
    -- If it exists, we DO NOT wipe hidden_at anymore. 
    -- The frontend will automatically unhide it because channels.updated_at 
    -- gets bumped above hidden_at by the database trigger as soon as a new message is inserted.
    RETURN existing_channel_id;
  END IF;

  -- If no channel exists, create a new one
  INSERT INTO public.channels (type)
  VALUES ('direct')
  RETURNING id INTO new_channel_id;

  -- Add the current user
  INSERT INTO public.channel_members (channel_id, user_id, role)
  VALUES (new_channel_id, auth.uid(), 'admin');

  -- Add the other user
  INSERT INTO public.channel_members (channel_id, user_id, role)
  VALUES (new_channel_id, other_user_id, 'member');

  RETURN new_channel_id;
END;
$$;
