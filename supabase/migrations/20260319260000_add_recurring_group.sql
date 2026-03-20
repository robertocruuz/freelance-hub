ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS recurring_group_id UUID;

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS recurring_group_id UUID;
