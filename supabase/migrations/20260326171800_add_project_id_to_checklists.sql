-- Add project_id to user_checklists
ALTER TABLE public.user_checklists 
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- The existing RLS policies already use auth.uid() = user_id, 
-- which is sufficient since projects also belong to users.
-- However, we can make it even more explicit if needed.
-- For now, the existing policies are fine as they cover the owner of the item.
