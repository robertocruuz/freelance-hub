-- Allow users to delete direct channels if they are a member
CREATE POLICY "Users can delete direct channels" ON public.channels
  FOR DELETE
  USING (
    type = 'direct' AND
    EXISTS (
      SELECT 1 FROM public.channel_members
      WHERE channel_members.channel_id = channels.id
      AND channel_members.user_id = auth.uid()
    )
  );
