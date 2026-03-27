-- 1. DESTRUCTIVE CLEANUP: Remove ALL potential policies to avoid conflicts
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_checklists' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_checklists', pol.policyname);
    END LOOP;
END $$;

-- 2. CREATE NEW ROBUST POLICIES
-- SELECT: Owner OR anyone who can see the project
CREATE POLICY "select_shared" ON public.user_checklists FOR SELECT 
    USING (auth.uid() = user_id OR (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id)));

-- INSERT: Owner OR project editor/admin
CREATE POLICY "insert_shared" ON public.user_checklists FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.get_org_role(p.user_id) IN ('admin', 'editor', 'collaborator')))));

-- UPDATE: Owner OR project editor/admin
CREATE POLICY "update_shared" ON public.user_checklists FOR UPDATE 
    USING (auth.uid() = user_id OR (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.get_org_role(p.user_id) IN ('admin', 'editor', 'collaborator')))));

-- DELETE: Owner OR project admin
CREATE POLICY "delete_shared" ON public.user_checklists FOR DELETE 
    USING (auth.uid() = user_id OR (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.get_org_role(p.user_id) IN ('admin', 'collaborator')))));

-- 3. ENSURE REALTIME IS TRULY ACTIVE
ALTER TABLE public.user_checklists REPLICA IDENTITY FULL;

-- Re-add to publication (idempotent-ish)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_checklists;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Already exists
END $$;
