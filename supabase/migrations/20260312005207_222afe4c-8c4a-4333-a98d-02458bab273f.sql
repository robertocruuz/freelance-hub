
-- Update lead_stages SELECT policy to also show stages containing individually shared leads
DROP POLICY IF EXISTS "Users can view lead stages" ON public.lead_stages;

CREATE POLICY "Users can view lead stages"
ON public.lead_stages FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR is_org_colleague(user_id)
  OR is_shared_with_me('pipeline', user_id)
  OR EXISTS (
    SELECT 1 FROM leads l
    WHERE l.stage_id = lead_stages.id
    AND is_shared_with_me('lead', l.id)
  )
);
