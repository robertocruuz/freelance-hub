-- Allow users to update their own membership (e.g., accepting invite changes status from pending to accepted)
DROP POLICY IF EXISTS "Admins can update org members" ON public.organization_members;

CREATE POLICY "Admins or self can update org members"
  ON public.organization_members FOR UPDATE
  TO authenticated
  USING (is_org_admin(organization_id) OR (user_id = auth.uid()));