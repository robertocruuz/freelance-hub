-- 1. Add missing updated_at column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_checklists' AND column_name = 'updated_at') THEN
    ALTER TABLE public.user_checklists ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
END $$;

-- 2. Ensure the table is in the realtime publication
-- (If it's already there, this might error, so we use a safe approach)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'user_checklists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_checklists;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Already in publication or other error we can ignore if it's already active
END $$;

-- 3. Double check REPLICA IDENTITY
ALTER TABLE public.user_checklists REPLICA IDENTITY FULL;
