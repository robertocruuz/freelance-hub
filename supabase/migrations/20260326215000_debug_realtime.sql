-- TEMPORARY DEBUG: Allow ALL authenticated users to see ALL checklist items
-- This is just to test if RLS is the blocker for Realtime
DROP POLICY IF EXISTS "Users can view checklist items" ON public.user_checklists;
CREATE POLICY "Users can view checklist items debug" 
    ON public.user_checklists FOR SELECT 
    TO authenticated
    USING (true);

-- Ensure publication is really active
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
-- Note: FOR ALL TABLES might fail if user doesn't have superuser, but usually okay in Supabase.
-- If it fails, at least we know.
