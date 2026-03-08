
-- Update RLS policies on clients to allow org colleagues access
-- SELECT: owner OR org colleague (any role)
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
CREATE POLICY "Users can view own clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_org_colleague(user_id));

-- INSERT: owner only (keep as is)
-- UPDATE: owner OR org colleague with admin/editor role
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
CREATE POLICY "Users can update own clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'editor'));

-- DELETE: owner OR org admin
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;
CREATE POLICY "Users can delete own clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) = 'admin');

-- Update RLS on budgets
DROP POLICY IF EXISTS "Users can view own budgets" ON public.budgets;
CREATE POLICY "Users can view own budgets"
  ON public.budgets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_org_colleague(user_id));

DROP POLICY IF EXISTS "Users can update own budgets" ON public.budgets;
CREATE POLICY "Users can update own budgets"
  ON public.budgets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'editor'));

DROP POLICY IF EXISTS "Users can delete own budgets" ON public.budgets;
CREATE POLICY "Users can delete own budgets"
  ON public.budgets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) = 'admin');

-- Update RLS on projects
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_org_colleague(user_id));

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'editor'));

DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) = 'admin');

-- Update RLS on invoices
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_org_colleague(user_id));

DROP POLICY IF EXISTS "Users can update own invoices" ON public.invoices;
CREATE POLICY "Users can update own invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'editor'));

DROP POLICY IF EXISTS "Users can delete own invoices" ON public.invoices;
CREATE POLICY "Users can delete own invoices"
  ON public.invoices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) = 'admin');

-- Update RLS on tasks
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_org_colleague(user_id));

DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'editor'));

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) = 'admin');

-- Update RLS on time_entries
DROP POLICY IF EXISTS "Users can view own time entries" ON public.time_entries;
CREATE POLICY "Users can view own time entries"
  ON public.time_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_org_colleague(user_id));

DROP POLICY IF EXISTS "Users can update own time entries" ON public.time_entries;
CREATE POLICY "Users can update own time entries"
  ON public.time_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'editor'));

DROP POLICY IF EXISTS "Users can delete own time entries" ON public.time_entries;
CREATE POLICY "Users can delete own time entries"
  ON public.time_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) = 'admin');

-- Update RLS on kanban_boards
DROP POLICY IF EXISTS "Users can view own boards" ON public.kanban_boards;
CREATE POLICY "Users can view own boards"
  ON public.kanban_boards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_org_colleague(user_id));

DROP POLICY IF EXISTS "Users can update own boards" ON public.kanban_boards;
CREATE POLICY "Users can update own boards"
  ON public.kanban_boards FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'editor'));

DROP POLICY IF EXISTS "Users can delete own boards" ON public.kanban_boards;
CREATE POLICY "Users can delete own boards"
  ON public.kanban_boards FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) = 'admin');

-- Update RLS on kanban_columns
DROP POLICY IF EXISTS "Users can view own columns" ON public.kanban_columns;
CREATE POLICY "Users can view own columns"
  ON public.kanban_columns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_org_colleague(user_id));

DROP POLICY IF EXISTS "Users can update own columns" ON public.kanban_columns;
CREATE POLICY "Users can update own columns"
  ON public.kanban_columns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'editor'));

DROP POLICY IF EXISTS "Users can delete own columns" ON public.kanban_columns;
CREATE POLICY "Users can delete own columns"
  ON public.kanban_columns FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) = 'admin');
