
-- Drop and recreate policies that reference auth.users
DROP POLICY IF EXISTS "Users can read invites by their email" ON public.organization_invites;
DROP POLICY IF EXISTS "Users can update invites sent to them" ON public.organization_invites;
DROP POLICY IF EXISTS "Invited users can view org basic info" ON public.organizations;

CREATE POLICY "Users can read invites by their email"
  ON public.organization_invites FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can update invites sent to them"
  ON public.organization_invites FOR UPDATE
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

CREATE POLICY "Invited users can view org basic info"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_invites
      WHERE organization_invites.organization_id = organizations.id
      AND organization_invites.email = (auth.jwt() ->> 'email')
      AND organization_invites.status = 'pending'
    )
  );
