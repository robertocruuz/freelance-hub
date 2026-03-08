ALTER TABLE public.budgets ADD COLUMN name text DEFAULT NULL;
ALTER TABLE public.budgets ADD COLUMN budget_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.budgets ADD COLUMN validity_date date DEFAULT NULL;
ALTER TABLE public.budgets ADD COLUMN delivery_date date DEFAULT NULL;