
-- Kanban columns
CREATE TABLE public.kanban_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  wip_limit INTEGER DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own columns" ON public.kanban_columns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own columns" ON public.kanban_columns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own columns" ON public.kanban_columns FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own columns" ON public.kanban_columns FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  column_id UUID REFERENCES public.kanban_columns(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  task_type TEXT DEFAULT NULL,
  complexity INTEGER DEFAULT 1,
  estimated_value NUMERIC DEFAULT 0,
  real_value NUMERIC DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  start_date DATE DEFAULT NULL,
  due_date DATE DEFAULT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  estimated_time INTEGER DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Task labels
CREATE TABLE public.task_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#FBBF24',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own labels" ON public.task_labels FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own labels" ON public.task_labels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own labels" ON public.task_labels FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own labels" ON public.task_labels FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Task label assignments
CREATE TABLE public.task_label_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.task_labels(id) ON DELETE CASCADE,
  UNIQUE(task_id, label_id)
);

ALTER TABLE public.task_label_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own task labels" ON public.task_label_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_id AND tasks.user_id = auth.uid()));

-- Task checklists
CREATE TABLE public.task_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Checklist',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own checklists" ON public.task_checklists FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_id AND tasks.user_id = auth.uid()));

-- Checklist items
CREATE TABLE public.task_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES public.task_checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  due_date DATE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own checklist items" ON public.task_checklist_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_checklists cl
    JOIN public.tasks t ON t.id = cl.task_id
    WHERE cl.id = checklist_id AND t.user_id = auth.uid()
  ));

-- Task comments
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task comments" ON public.task_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can insert task comments" ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.task_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Activity logs
CREATE TABLE public.task_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task activity" ON public.task_activity_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can insert task activity" ON public.task_activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at on tasks
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_columns;
