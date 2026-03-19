-- Enable realtime for task details tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_checklists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_checklist_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_activity_logs;
