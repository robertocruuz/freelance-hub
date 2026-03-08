
CREATE POLICY "Invited users can view org basic info"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_invites
      WHERE organization_invites.organization_id = organizations.id
      AND organization_invites.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND organization_invites.status = 'pending'
    )
  );
