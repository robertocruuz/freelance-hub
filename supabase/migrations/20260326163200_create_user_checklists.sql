-- Create user_checklists table
CREATE TABLE IF NOT EXISTS public.user_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_checklists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own checklist items" 
    ON public.user_checklists FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own checklist items" 
    ON public.user_checklists FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checklist items" 
    ON public.user_checklists FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checklist items" 
    ON public.user_checklists FOR DELETE 
    USING (auth.uid() = user_id);

-- Enable Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'user_checklists'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_checklists;
    END IF;
  END IF;
END $$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_checklists_updated_at
    BEFORE UPDATE ON public.user_checklists
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
