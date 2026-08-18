CREATE TABLE public.pharmacy_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  prescription_id uuid REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  prescription_item_id uuid REFERENCES public.prescription_items(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.products(id),
  batch_id uuid REFERENCES public.product_batches(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tax_percent numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoice_item_id uuid REFERENCES public.invoice_items(id) ON DELETE SET NULL,
  dispensed_by uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'dispensed',
  returned_qty integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_sales TO authenticated;
GRANT ALL ON public.pharmacy_sales TO service_role;

ALTER TABLE public.pharmacy_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pharmacy_sales_select" ON public.pharmacy_sales FOR SELECT TO authenticated
USING (public.is_finance(auth.uid()) OR public.is_clinical(auth.uid()) OR public.owns_patient(patient_id));

CREATE POLICY "pharmacy_sales_insert" ON public.pharmacy_sales FOR INSERT TO authenticated
WITH CHECK (public.is_finance(auth.uid()) OR public.is_clinical(auth.uid()));

CREATE POLICY "pharmacy_sales_update" ON public.pharmacy_sales FOR UPDATE TO authenticated
USING (public.is_finance(auth.uid()) OR public.is_clinical(auth.uid()));

CREATE POLICY "pharmacy_sales_delete" ON public.pharmacy_sales FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE UNIQUE INDEX pharmacy_sales_unique_rx_item
  ON public.pharmacy_sales (prescription_item_id)
  WHERE prescription_item_id IS NOT NULL AND status = 'dispensed';

CREATE INDEX pharmacy_sales_patient_idx ON public.pharmacy_sales (patient_id, created_at DESC);
CREATE INDEX pharmacy_sales_visit_idx ON public.pharmacy_sales (visit_id);

CREATE TRIGGER trg_pharmacy_sales_updated BEFORE UPDATE ON public.pharmacy_sales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_audit_pharmacy_sales AFTER INSERT OR UPDATE OR DELETE ON public.pharmacy_sales
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();