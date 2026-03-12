
ALTER TABLE public.invoices
ADD COLUMN is_recurring boolean NOT NULL DEFAULT false,
ADD COLUMN recurring_months integer DEFAULT 12;
