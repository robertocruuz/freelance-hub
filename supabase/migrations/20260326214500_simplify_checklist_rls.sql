-- 1. Simplify SELECT policy: Any project member (checked via projects table) can view
DROP POLICY IF EXISTS "Users can view checklist items" ON public.user_checklists;
CREATE POLICY "Users can view checklist items" 
    ON public.user_checklists FOR SELECT 
    USING (
      auth.uid() = user_id OR 
      (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = project_id
      ))
    );

-- 2. Simplify INSERT/UPDATE/DELETE: Same logic
-- If you can update the project, you can manage its checklists
DROP POLICY IF EXISTS "Users can insert checklist items" ON public.user_checklists;
CREATE POLICY "Users can insert checklist items" 
    ON public.user_checklists FOR INSERT 
    WITH CHECK (
      auth.uid() = user_id OR 
      (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.get_org_role(p.user_id) IN ('admin', 'editor', 'collaborator'))
      ))
    );

DROP POLICY IF EXISTS "Users can update checklist items" ON public.user_checklists;
CREATE POLICY "Users can update checklist items" 
    ON public.user_checklists FOR UPDATE 
    USING (
      auth.uid() = user_id OR 
      (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.get_org_role(p.user_id) IN ('admin', 'editor', 'collaborator'))
      ))
    );

DROP POLICY IF EXISTS "Users can delete checklist items" ON public.user_checklists;
CREATE POLICY "Users can delete checklist items" 
    ON public.user_checklists FOR DELETE 
    USING (
      auth.uid() = user_id OR 
      (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.get_org_role(p.user_id) IN ('admin', 'editor', 'collaborator'))
      ))
    );
