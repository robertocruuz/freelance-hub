
-- Update kanban_columns SELECT to also show columns containing individually shared tasks
DROP POLICY IF EXISTS "Users can view own columns" ON public.kanban_columns;

CREATE POLICY "Users can view own columns"
ON public.kanban_columns FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR is_board_shared_column(id)
  OR EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.column_id = kanban_columns.id
    AND is_task_shared(t.id)
  )
);

-- Update kanban_boards SELECT to also show boards containing columns with shared tasks
DROP POLICY IF EXISTS "Users can view own boards" ON public.kanban_boards;

CREATE POLICY "Users can view own boards"
ON public.kanban_boards FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR is_shared_with_me('board', id)
  OR EXISTS (
    SELECT 1 FROM kanban_columns kc
    JOIN tasks t ON t.column_id = kc.id
    WHERE kc.board_id = kanban_boards.id
    AND is_task_shared(t.id)
  )
);
