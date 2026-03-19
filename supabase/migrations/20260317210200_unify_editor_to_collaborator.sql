-- Unify org_role: replace all 'editor' references with 'collaborator'
-- The 'collaborator' value was already added to the enum in the previous migration.
-- This migration updates all RLS policies and existing data to use 'collaborator' consistently.

-- 1. Migrate any existing members/invites with role 'editor' to 'collaborator'
UPDATE public.organization_members SET role = 'collaborator' WHERE role = 'editor';
UPDATE public.organization_invites SET role = 'collaborator' WHERE role = 'editor';

-- 2. Update RLS policies on clients
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
CREATE POLICY "Users can update own clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'collaborator'));

-- 3. Update RLS policies on budgets
DROP POLICY IF EXISTS "Users can update own budgets" ON public.budgets;
CREATE POLICY "Users can update own budgets"
  ON public.budgets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'collaborator'));

-- 4. Update RLS policies on projects
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'collaborator'));

-- 5. Update RLS policies on invoices
DROP POLICY IF EXISTS "Users can update own invoices" ON public.invoices;
CREATE POLICY "Users can update own invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'collaborator'));

-- 6. Update RLS policies on tasks
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_task_shared(id) OR public.get_org_role(user_id) IN ('admin', 'collaborator'));

-- 7. Update RLS policies on time_entries
DROP POLICY IF EXISTS "Users can update own time entries" ON public.time_entries;
CREATE POLICY "Users can update own time entries"
  ON public.time_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'collaborator'));

-- 8. Update RLS policies on kanban_boards
DROP POLICY IF EXISTS "Users can update own boards" ON public.kanban_boards;
CREATE POLICY "Users can update own boards"
  ON public.kanban_boards FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'collaborator'));

-- 9. Update RLS policies on kanban_columns
DROP POLICY IF EXISTS "Users can update own columns" ON public.kanban_columns;
CREATE POLICY "Users can update own columns"
  ON public.kanban_columns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.get_org_role(user_id) IN ('admin', 'collaborator'));
