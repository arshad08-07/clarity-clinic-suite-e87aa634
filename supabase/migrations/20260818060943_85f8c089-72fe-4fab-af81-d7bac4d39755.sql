ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS source_ref text;

CREATE INDEX IF NOT EXISTS idx_invoice_items_source ON public.invoice_items (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_invoices_visit ON public.invoices (visit_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments (invoice_id);