-- Create project_favorites table
CREATE TABLE IF NOT EXISTS public.project_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, project_id)
);

-- Enable RLS
ALTER TABLE public.project_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own favorites" 
    ON public.project_favorites FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" 
    ON public.project_favorites FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" 
    ON public.project_favorites FOR DELETE 
    USING (auth.uid() = user_id);

-- Migrate existing favorites (from projects.is_favorite)
INSERT INTO public.project_favorites (user_id, project_id)
SELECT user_id, id 
FROM public.projects 
WHERE is_favorite = true
ON CONFLICT (user_id, project_id) DO NOTHING;

-- Enable Realtime for project_favorites
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'project_favorites'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.project_favorites;
    END IF;
  END IF;
END $$;
