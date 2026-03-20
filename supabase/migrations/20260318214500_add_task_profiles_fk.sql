-- Add a foreign key constraint to link tasks.user_id directly to profiles.user_id
-- This allows Supabase REST API to native join profiles when selecting tasks.

ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS fk_tasks_user_profile;
ALTER TABLE public.tasks
ADD CONSTRAINT fk_tasks_user_profile
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- Also add a constraint for updated_by for completeness, if it's not already there
ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS fk_tasks_updated_by_profile;
ALTER TABLE public.tasks
ADD CONSTRAINT fk_tasks_updated_by_profile
FOREIGN KEY (updated_by) REFERENCES public.profiles(user_id)
ON DELETE SET NULL;
