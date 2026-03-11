
-- Lead pipeline stages table
CREATE TABLE public.lead_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lead stages" ON public.lead_stages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Leads (deals) table
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  stage_id uuid REFERENCES public.lead_stages(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  probability integer NOT NULL DEFAULT 50,
  expected_close_date date,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  status text NOT NULL DEFAULT 'open',
  position integer NOT NULL DEFAULT 0,
  won_at timestamp with time zone,
  lost_at timestamp with time zone,
  lost_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own leads" ON public.leads
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_org_colleague(user_id));

CREATE POLICY "Users can insert own leads" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR get_org_role(user_id) IN ('admin', 'collaborator'));

CREATE POLICY "Users can delete own leads" ON public.leads
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR get_org_role(user_id) = 'admin');

-- Trigger for updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
