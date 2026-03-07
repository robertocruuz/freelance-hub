
-- Create project_items table
CREATE TABLE public.project_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_items ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can manage items of their own projects
CREATE POLICY "Users can manage own project items"
ON public.project_items
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.projects
  WHERE projects.id = project_items.project_id
  AND projects.user_id = auth.uid()
));

-- Remove hourly_rate from projects
ALTER TABLE public.projects DROP COLUMN hourly_rate;
