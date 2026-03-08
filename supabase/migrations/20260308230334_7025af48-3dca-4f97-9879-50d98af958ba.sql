
CREATE POLICY "Users can read invites by their email"
  ON public.organization_invites FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can update invites sent to them"
  ON public.organization_invites FOR UPDATE
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
