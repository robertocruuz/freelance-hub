
-- Update leads SELECT policy to also support individual lead sharing
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;

CREATE POLICY "Users can view own leads"
ON public.leads FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR is_org_colleague(user_id)
  OR is_shared_with_me('pipeline', user_id)
  OR is_shared_with_me('lead', id)
);

-- Update leads UPDATE policy to also support individual lead sharing
DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;

CREATE POLICY "Users can update own leads"
ON public.leads FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR get_org_role(user_id) IN ('admin', 'collaborator')
  OR is_shared_with_me('lead', id)
);
