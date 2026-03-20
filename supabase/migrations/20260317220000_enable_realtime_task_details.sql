-- Enable realtime for task details tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['task_comments', 'task_checklists', 'task_checklist_items', 'task_activity_logs']) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;
