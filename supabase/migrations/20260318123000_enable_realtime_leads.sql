-- Enable realtime for leads and lead_stages tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['lead_stages', 'leads']) LOOP
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
