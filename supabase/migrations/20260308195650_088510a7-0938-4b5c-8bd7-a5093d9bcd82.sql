
-- Create kanban_boards table
CREATE TABLE public.kanban_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add board_id to kanban_columns
ALTER TABLE public.kanban_columns ADD COLUMN board_id UUID REFERENCES public.kanban_boards(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;

-- RLS policies for kanban_boards
CREATE POLICY "Users can view own boards" ON public.kanban_boards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own boards" ON public.kanban_boards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own boards" ON public.kanban_boards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own boards" ON public.kanban_boards FOR DELETE USING (auth.uid() = user_id);
