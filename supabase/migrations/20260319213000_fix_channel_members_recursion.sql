-- Create security definer function to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_channel_member(check_channel_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.channel_members 
    WHERE channel_id = check_channel_id 
    AND user_id = auth.uid()
  );
END;
$$;

-- Fix Channels policies
DROP POLICY IF EXISTS "Users can view channels they are members of" ON public.channels;
CREATE POLICY "Users can view channels they are members of" ON public.channels
    FOR SELECT USING (public.is_channel_member(id));

-- Fix Channel Members policies
DROP POLICY IF EXISTS "Users can view members of their channels" ON public.channel_members;
CREATE POLICY "Users can view members of their channels" ON public.channel_members
    FOR SELECT USING (public.is_channel_member(channel_id));

-- Fix Messages policies
DROP POLICY IF EXISTS "Users can view messages in their channels" ON public.messages;
CREATE POLICY "Users can view messages in their channels" ON public.messages
    FOR SELECT USING (public.is_channel_member(channel_id));

DROP POLICY IF EXISTS "Users can insert messages in their channels" ON public.messages;
CREATE POLICY "Users can insert messages in their channels" ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND public.is_channel_member(channel_id)
    );

-- Fix Message Reactions policies
DROP POLICY IF EXISTS "Users can view reactions in their channels" ON public.message_reactions;
CREATE POLICY "Users can view reactions in their channels" ON public.message_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            WHERE m.id = message_reactions.message_id
            AND public.is_channel_member(m.channel_id)
        )
    );
