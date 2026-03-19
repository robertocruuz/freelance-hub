-- Enable realtime for leads and lead_stages tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_stages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
