-- Allow collaborators to delete projects
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'collaborator'));

-- Allow collaborators to delete project items
DROP POLICY IF EXISTS "Users can delete project items" ON public.project_items;
CREATE POLICY "Users can delete project items"
  ON public.project_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_items.project_id
      AND (projects.user_id = auth.uid() OR public.get_org_role(projects.user_id) IN ('admin', 'collaborator'))
    )
  );

-- Allow collaborators to delete tasks
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'collaborator'));

-- Allow collaborators to delete time entries
DROP POLICY IF EXISTS "Users can delete own time entries" ON public.time_entries;
CREATE POLICY "Users can delete own time entries"
  ON public.time_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'collaborator'));

-- Allow collaborators to delete project files
DROP POLICY IF EXISTS "Users can delete own project files" ON public.project_files;
CREATE POLICY "Users can delete own project files"
  ON public.project_files FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_files.project_id
    AND public.get_org_role(projects.user_id) IN ('admin', 'collaborator')
  ));
