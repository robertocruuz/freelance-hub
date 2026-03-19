-- Ensure kanban_boards is published to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_boards;

-- Set REPLICA IDENTITY FULL for granular real-time RLS evaluation
-- This ensures that Supabase Realtime always sends the full previous and new rows.
-- The RLS policies for shared tasks rely on column values (like column_id) that might not be 
-- present in the WAL stream for an UPDATE event if REPLICA IDENTITY is DEFAULT.
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.kanban_columns REPLICA IDENTITY FULL;
ALTER TABLE public.kanban_boards REPLICA IDENTITY FULL;
