-- Update RLS policies for user_checklists to allow project-wide sharing

-- 1. View policy: owner OR project member
DROP POLICY IF EXISTS "Users can view their own checklist items" ON public.user_checklists;
CREATE POLICY "Users can view checklist items" 
    ON public.user_checklists FOR SELECT 
    USING (
      auth.uid() = user_id OR 
      (project_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.is_org_colleague(p.user_id)))
      ))
    );

-- 2. Insert policy: owner OR someone with collaborator/admin role in the project's organization
DROP POLICY IF EXISTS "Users can insert their own checklist items" ON public.user_checklists;
CREATE POLICY "Users can insert checklist items" 
    ON public.user_checklists FOR INSERT 
    WITH CHECK (
      auth.uid() = user_id OR 
      (project_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.get_org_role(p.user_id) IN ('admin', 'collaborator')))
      ))
    );

-- 3. Update policy: owner OR collaborator/admin in the project's organization
DROP POLICY IF EXISTS "Users can update their own checklist items" ON public.user_checklists;
CREATE POLICY "Users can update checklist items" 
    ON public.user_checklists FOR UPDATE 
    USING (
      auth.uid() = user_id OR 
      (project_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.get_org_role(p.user_id) IN ('admin', 'collaborator')))
      ))
    );

-- 4. Delete policy: owner OR admin in the project's organization
DROP POLICY IF EXISTS "Users can delete their own checklist items" ON public.user_checklists;
CREATE POLICY "Users can delete checklist items" 
    ON public.user_checklists FOR DELETE 
    USING (
      auth.uid() = user_id OR 
      (project_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.get_org_role(p.user_id) = 'admin')))
      ))
    );
