
-- Allow org colleagues to view each other's profiles
CREATE POLICY "Org colleagues can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_org_colleague(user_id));
