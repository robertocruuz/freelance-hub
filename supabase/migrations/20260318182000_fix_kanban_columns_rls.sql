-- Fix kanban_columns RLS to permit querying sibling columns of shared tasks
DROP POLICY IF EXISTS "Users can view own columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Users can view columns" ON public.kanban_columns;

CREATE POLICY "Users can view columns" ON public.kanban_columns
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id 
    OR is_org_colleague(user_id) 
    OR is_board_shared_column(id)
    OR EXISTS (
      SELECT 1 FROM tasks t
      JOIN kanban_columns kc ON kc.id = t.column_id
      WHERE is_task_shared(t.id) 
        AND kc.user_id = kanban_columns.user_id
        AND (
          (kc.board_id IS NOT NULL AND kc.board_id = kanban_columns.board_id)
          OR
          (kc.board_id IS NULL AND kanban_columns.board_id IS NULL)
        )
    )
  );
