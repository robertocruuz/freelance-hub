ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '{"email": true, "tasks": true, "invites": true}'::jsonb;
