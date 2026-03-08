
ALTER TABLE public.organizations ADD COLUMN logo_url text;

INSERT INTO storage.buckets (id, name, public) VALUES ('org-logos', 'org-logos', true);

CREATE POLICY "Users can upload org logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'org-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own org logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'org-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own org logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'org-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view org logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'org-logos');
