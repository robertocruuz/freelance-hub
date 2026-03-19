-- Drop the old conflicting task update trigger to prevent duplicate notifications
DROP TRIGGER IF EXISTS on_task_updated ON public.tasks;
