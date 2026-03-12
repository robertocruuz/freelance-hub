
-- Update lead_stages RLS: allow org colleagues to view and collaborators/admins to update
DROP POLICY IF EXISTS "Users can manage own lead stages" ON public.lead_stages;

CREATE POLICY "Users can insert own lead stages"
ON public.lead_stages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view lead stages"
ON public.lead_stages FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR is_org_colleague(user_id)
  OR is_shared_with_me('pipeline', user_id)
);

CREATE POLICY "Users can update lead stages"
ON public.lead_stages FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR get_org_role(user_id) IN ('admin', 'collaborator')
);

CREATE POLICY "Users can delete own lead stages"
ON public.lead_stages FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR get_org_role(user_id) = 'admin'
);

-- Update leads RLS to also support share-based access
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;

CREATE POLICY "Users can view own leads"
ON public.leads FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR is_org_colleague(user_id)
  OR is_shared_with_me('pipeline', user_id)
);
