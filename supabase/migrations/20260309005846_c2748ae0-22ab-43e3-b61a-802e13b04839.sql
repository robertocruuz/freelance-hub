-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can manage own project items" ON public.project_items;

-- Create separate policies for each operation with org support

-- SELECT: Owner or org colleagues can view
CREATE POLICY "Users can view project items"
ON public.project_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_items.project_id
    AND (projects.user_id = auth.uid() OR is_org_colleague(projects.user_id))
  )
);

-- INSERT: Only project owner or org members can insert
CREATE POLICY "Users can insert project items"
ON public.project_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_items.project_id
    AND (projects.user_id = auth.uid() OR get_org_role(projects.user_id) IN ('admin', 'collaborator'))
  )
);

-- UPDATE: Owner or org admin/collaborator can update
CREATE POLICY "Users can update project items"
ON public.project_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_items.project_id
    AND (projects.user_id = auth.uid() OR get_org_role(projects.user_id) IN ('admin', 'collaborator'))
  )
);

-- DELETE: Only owner or org admin can delete
CREATE POLICY "Users can delete project items"
ON public.project_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_items.project_id
    AND (projects.user_id = auth.uid() OR get_org_role(projects.user_id) = 'admin')
  )
);