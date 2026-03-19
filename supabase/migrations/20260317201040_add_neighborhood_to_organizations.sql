-- Add neighborhood column to organizations table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS neighborhood text;
