-- Refine RLS policies for user_checklists and enable full replica identity for realtime
-- 1. Enable Full Replica Identity for better realtime filtering
ALTER TABLE public.user_checklists REPLICA IDENTITY FULL;

-- 2. Update SELECT policy (same as before, but ensure it's robust)
DROP POLICY IF EXISTS "Users can view checklist items" ON public.user_checklists;
CREATE POLICY "Users can view checklist items" 
    ON public.user_checklists FOR SELECT 
    USING (
      auth.uid() = user_id OR 
      (project_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.is_org_colleague(p.user_id)))
      ))
    );

-- 3. Update INSERT policy to include 'editor'
DROP POLICY IF EXISTS "Users can insert checklist items" ON public.user_checklists;
CREATE POLICY "Users can insert checklist items" 
    ON public.user_checklists FOR INSERT 
    WITH CHECK (
      auth.uid() = user_id OR 
      (project_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.get_org_role(p.user_id) IN ('admin', 'editor', 'collaborator')))
      ))
    );

-- 4. Update UPDATE policy to include 'editor'
DROP POLICY IF EXISTS "Users can update checklist items" ON public.user_checklists;
CREATE POLICY "Users can update checklist items" 
    ON public.user_checklists FOR UPDATE 
    USING (
      auth.uid() = user_id OR 
      (project_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.get_org_role(p.user_id) IN ('admin', 'editor', 'collaborator')))
      ))
    );

-- 5. Update DELETE policy (Admins, editors and collaborators can delete if they are colleagues)
DROP POLICY IF EXISTS "Users can delete checklist items" ON public.user_checklists;
CREATE POLICY "Users can delete checklist items" 
    ON public.user_checklists FOR DELETE 
    USING (
      auth.uid() = user_id OR 
      (project_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.get_org_role(p.user_id) IN ('admin', 'editor', 'collaborator')))
      ))
    );
