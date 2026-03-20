-- Migration: Implement Soft Deletes ('Delete for Me') for Direct Chats

-- 1. Add hidden_at timestamp to channel_members 
ALTER TABLE public.channel_members 
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE;

-- 2. Allow users to update their own channel_members row to hide the chat
--    Currently there is no UPDATE policy on channel_members, so let's create a specific one
DROP POLICY IF EXISTS "Users can update their own channel_members status" ON public.channel_members;

CREATE POLICY "Users can update their own channel_members status" ON public.channel_members
    FOR UPDATE USING (
        auth.uid() = user_id
    ) WITH CHECK (
        auth.uid() = user_id
    );

-- 3. Modify the policy "Users can delete direct channels" to ensure we're 
--    retaining the capability if actually requested by system, but our frontend 
--    will now use UPDATE instead of DELETE. We don't necessarily have to remove 
--    the actual DELETE policy, but relying on soft-deletes is safer.

-- 4. Update the RPC create_direct_channel to unhide a chat if someone creates it again
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
    -- If it exists, but was previously hidden by auth.uid(), unhide it
    UPDATE public.channel_members 
    SET hidden_at = NULL 
    WHERE channel_id = existing_channel_id 
    AND user_id = auth.uid() 
    AND hidden_at IS NOT NULL;
    
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
