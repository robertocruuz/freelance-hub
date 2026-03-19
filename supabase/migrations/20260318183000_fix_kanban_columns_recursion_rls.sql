-- Fix infinite recursion in kanban_columns
DROP POLICY IF EXISTS "Users can view columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Users can view own columns" ON public.kanban_columns;

CREATE POLICY "Users can view own columns" ON public.kanban_columns
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id 
    OR is_org_colleague(user_id) 
    OR is_board_shared_column(id)
    OR EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.column_id = kanban_columns.id
      AND is_task_shared(t.id)
    )
  );
