-- Add 'collaborator' to the org_role enum
-- The enum was created with ('admin', 'editor', 'viewer') but the application
-- uses 'collaborator' throughout the frontend and RLS policies.
ALTER TYPE public.org_role ADD VALUE IF NOT EXISTS 'collaborator';
