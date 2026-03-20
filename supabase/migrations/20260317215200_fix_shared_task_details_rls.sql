-- Replace the restricted RLS policies on task details with ones that check if the task is shared

-- task_comments
DROP POLICY IF EXISTS "Users can view task comments" ON public.task_comments;
CREATE POLICY "Users can view task comments" ON public.task_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (t.user_id = auth.uid() OR public.is_task_shared(t.id) OR public.is_org_colleague(t.user_id))));

DROP POLICY IF EXISTS "Users can insert task comments" ON public.task_comments;
CREATE POLICY "Users can insert task comments" ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (t.user_id = auth.uid() OR public.is_task_shared(t.id) OR public.get_org_role(t.user_id) IN ('admin', 'editor', 'collaborator'))));

-- task_activity_logs
DROP POLICY IF EXISTS "Users can view task activity" ON public.task_activity_logs;
CREATE POLICY "Users can view task activity" ON public.task_activity_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (t.user_id = auth.uid() OR public.is_task_shared(t.id) OR public.is_org_colleague(t.user_id))));

DROP POLICY IF EXISTS "Users can insert task activity" ON public.task_activity_logs;
CREATE POLICY "Users can insert task activity" ON public.task_activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (t.user_id = auth.uid() OR public.is_task_shared(t.id) OR public.get_org_role(t.user_id) IN ('admin', 'editor', 'collaborator'))));

-- task_checklists
DROP POLICY IF EXISTS "Users can manage own checklists" ON public.task_checklists;
DROP POLICY IF EXISTS "Users can manage checklists" ON public.task_checklists;
CREATE POLICY "Users can manage checklists" ON public.task_checklists FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (t.user_id = auth.uid() OR public.is_task_shared(t.id) OR public.get_org_role(t.user_id) IN ('admin', 'editor', 'collaborator'))));

-- task_checklist_items
DROP POLICY IF EXISTS "Users can manage own checklist items" ON public.task_checklist_items;
DROP POLICY IF EXISTS "Users can manage checklist items" ON public.task_checklist_items;
CREATE POLICY "Users can manage checklist items" ON public.task_checklist_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_checklists cl
    JOIN public.tasks t ON t.id = cl.task_id
    WHERE cl.id = checklist_id AND (t.user_id = auth.uid() OR public.is_task_shared(t.id) OR public.get_org_role(t.user_id) IN ('admin', 'editor', 'collaborator'))
  ));

-- task_label_assignments
DROP POLICY IF EXISTS "Users can manage own task labels" ON public.task_label_assignments;
DROP POLICY IF EXISTS "Users can manage task labels" ON public.task_label_assignments;
CREATE POLICY "Users can manage task labels" ON public.task_label_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (t.user_id = auth.uid() OR public.is_task_shared(t.id) OR public.get_org_role(t.user_id) IN ('admin', 'editor', 'collaborator'))));


-- task_labels
DROP POLICY IF EXISTS "Users can view own labels" ON public.task_labels;
DROP POLICY IF EXISTS "Users can view labels" ON public.task_labels;
CREATE POLICY "Users can view labels" ON public.task_labels FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.task_label_assignments tla
      JOIN public.tasks t ON t.id = tla.task_id
      WHERE tla.label_id = task_labels.id AND (t.user_id = auth.uid() OR public.is_task_shared(t.id) OR public.is_org_colleague(t.user_id))
    ) OR
    public.is_org_colleague(user_id)
  );

