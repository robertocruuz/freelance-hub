ALTER TABLE public.budgets ADD COLUMN discount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.budgets ADD COLUMN notes text DEFAULT NULL;