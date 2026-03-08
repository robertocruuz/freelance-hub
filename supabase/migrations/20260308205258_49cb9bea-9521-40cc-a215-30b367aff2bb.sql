
-- Create shares table for granular sharing of boards and tasks
CREATE TABLE public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL, -- 'board' or 'task'
  resource_id UUID NOT NULL,
  share_type TEXT NOT NULL, -- 'org' or 'user'
  shared_with_user_id UUID, -- null when share_type = 'org'
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(resource_type, resource_id, share_type, shared_with_user_id)
);

ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- Security definer: check if a resource is shared with current user
CREATE OR REPLACE FUNCTION public.is_shared_with_me(_resource_type TEXT, _resource_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Shared directly with user
    SELECT 1 FROM shares
    WHERE resource_type = _resource_type
    AND resource_id = _resource_id
    AND share_type = 'user'
    AND shared_with_user_id = auth.uid()
  ) OR EXISTS (
    -- Shared with org and user is in same org as creator
    SELECT 1 FROM shares s
    JOIN organization_members om1 ON om1.user_id = s.created_by AND om1.status = 'accepted'
    JOIN organization_members om2 ON om2.organization_id = om1.organization_id AND om2.user_id = auth.uid() AND om2.status = 'accepted'
    WHERE s.resource_type = _resource_type
    AND s.resource_id = _resource_id
    AND s.share_type = 'org'
  )
$$;

-- RLS for shares table
CREATE POLICY "Users can view shares for their resources"
  ON public.shares FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR shared_with_user_id = auth.uid() OR public.is_shared_with_me(resource_type, resource_id));

CREATE POLICY "Users can create shares for own resources"
  ON public.shares FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own shares"
  ON public.shares FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Update kanban_boards RLS: owner OR shared with me
DROP POLICY IF EXISTS "Users can view own boards" ON public.kanban_boards;
CREATE POLICY "Users can view own boards"
  ON public.kanban_boards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_shared_with_me('board', id));

DROP POLICY IF EXISTS "Users can update own boards" ON public.kanban_boards;
CREATE POLICY "Users can update own boards"
  ON public.kanban_boards FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own boards" ON public.kanban_boards;
CREATE POLICY "Users can delete own boards"
  ON public.kanban_boards FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update kanban_columns RLS: owner OR column belongs to shared board
CREATE OR REPLACE FUNCTION public.is_board_shared_column(_column_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM kanban_columns kc
    WHERE kc.id = _column_id
    AND kc.board_id IS NOT NULL
    AND public.is_shared_with_me('board', kc.board_id)
  )
$$;

DROP POLICY IF EXISTS "Users can view own columns" ON public.kanban_columns;
CREATE POLICY "Users can view own columns"
  ON public.kanban_columns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_board_shared_column(id));

DROP POLICY IF EXISTS "Users can update own columns" ON public.kanban_columns;
CREATE POLICY "Users can update own columns"
  ON public.kanban_columns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own columns" ON public.kanban_columns;
CREATE POLICY "Users can delete own columns"
  ON public.kanban_columns FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update tasks RLS: owner OR shared with me OR belongs to shared board
CREATE OR REPLACE FUNCTION public.is_task_shared(_task_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Task directly shared
    SELECT 1 WHERE public.is_shared_with_me('task', _task_id)
  ) OR EXISTS (
    -- Task in a shared board
    SELECT 1 FROM tasks t
    JOIN kanban_columns kc ON kc.id = t.column_id
    WHERE t.id = _task_id
    AND kc.board_id IS NOT NULL
    AND public.is_shared_with_me('board', kc.board_id)
  )
$$;

DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_task_shared(id) OR public.is_org_colleague(user_id));

DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_task_shared(id) OR public.get_org_role(user_id) IN ('admin', 'editor'));

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) = 'admin');
