-- Fix channel_members INSERT policy to allow adding other users to a channel you belong to
DROP POLICY IF EXISTS "Users can insert themselves into channels" ON public.channel_members;
DROP POLICY IF EXISTS "Users can insert members into channels" ON public.channel_members;
CREATE POLICY "Users can insert members into channels" ON public.channel_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR public.is_channel_member(channel_id)
    );

-- Add missing DELETE policy so users can leave channels
DROP POLICY IF EXISTS "Users can delete themselves from channels" ON public.channel_members;
CREATE POLICY "Users can delete themselves from channels" ON public.channel_members
    FOR DELETE USING (
        user_id = auth.uid()
    );
