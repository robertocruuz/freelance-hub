-- Create a function to securely create a direct channel and add both members atomically
-- This bypasses the RLS visibility issue (403 Forbidden) when trying to SELECT a newly inserted channel
-- before the user is actually added to channel_members.
CREATE OR REPLACE FUNCTION public.create_direct_channel(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_channel_id uuid;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
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
