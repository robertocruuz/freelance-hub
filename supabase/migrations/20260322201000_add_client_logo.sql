-- Migration to add logo_url to clients and create client-logos bucket

-- Add logo_url to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create the client-logos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for client-logos bucket
CREATE POLICY "Public Access for client-logos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'client-logos');

CREATE POLICY "Authenticated users can upload to client-logos" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'client-logos' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update their client-logos" 
ON storage.objects FOR UPDATE 
WITH CHECK (
    bucket_id = 'client-logos' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete their client-logos" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'client-logos' 
    AND auth.role() = 'authenticated'
);
