-- optometry richer fields
ALTER TABLE public.optometry_records
  ADD COLUMN IF NOT EXISTS near_va_od text, ADD COLUMN IF NOT EXISTS near_va_os text,
  ADD COLUMN IF NOT EXISTS aided_va_od text, ADD COLUMN IF NOT EXISTS aided_va_os text,
  ADD COLUMN IF NOT EXISTS auto_ref_od text, ADD COLUMN IF NOT EXISTS auto_ref_os text,
  ADD COLUMN IF NOT EXISTS prism_od text, ADD COLUMN IF NOT EXISTS prism_os text,
  ADD COLUMN IF NOT EXISTS pachymetry_od numeric, ADD COLUMN IF NOT EXISTS pachymetry_os numeric,
  ADD COLUMN IF NOT EXISTS contrast_sensitivity text, ADD COLUMN IF NOT EXISTS visual_field text;

-- examination richer fields
ALTER TABLE public.examinations
  ADD COLUMN IF NOT EXISTS lashes_od text, ADD COLUMN IF NOT EXISTS lashes_os text,
  ADD COLUMN IF NOT EXISTS lacrimal_od text, ADD COLUMN IF NOT EXISTS lacrimal_os text,
  ADD COLUMN IF NOT EXISTS sclera_od text, ADD COLUMN IF NOT EXISTS sclera_os text,
  ADD COLUMN IF NOT EXISTS iris_od text, ADD COLUMN IF NOT EXISTS iris_os text,
  ADD COLUMN IF NOT EXISTS vitreous_od text, ADD COLUMN IF NOT EXISTS vitreous_os text,
  ADD COLUMN IF NOT EXISTS optic_disc_od text, ADD COLUMN IF NOT EXISTS optic_disc_os text,
  ADD COLUMN IF NOT EXISTS macula_od text, ADD COLUMN IF NOT EXISTS macula_os text,
  ADD COLUMN IF NOT EXISTS retina_od text, ADD COLUMN IF NOT EXISTS retina_os text,
  ADD COLUMN IF NOT EXISTS vessels_od text, ADD COLUMN IF NOT EXISTS vessels_os text;

ALTER TABLE public.patient_diagnoses ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT true;
ALTER TABLE public.prescription_items
  ADD COLUMN IF NOT EXISTS strength text, ADD COLUMN IF NOT EXISTS route text;

-- ===== product batches =====
CREATE TABLE IF NOT EXISTS public.product_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id),
  batch_no text NOT NULL,
  expiry_date date,
  quantity integer NOT NULL DEFAULT 0,
  cost_price numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_batches TO authenticated;
GRANT ALL ON public.product_batches TO service_role;
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_read_batches ON public.product_batches FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY finance_write_batches ON public.product_batches FOR INSERT TO authenticated WITH CHECK (public.is_finance(auth.uid()));
CREATE POLICY finance_update_batches ON public.product_batches FOR UPDATE TO authenticated USING (public.is_finance(auth.uid())) WITH CHECK (public.is_finance(auth.uid()));
CREATE POLICY admin_delete_batches ON public.product_batches FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_batches_product ON public.product_batches (product_id, expiry_date);

ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.product_batches(id);

-- sale deducts stock, blocks expired batch / insufficient stock
CREATE OR REPLACE FUNCTION public.invoice_item_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _exp date; _bqty integer; _sqty integer;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NULL; END IF;
  IF NEW.batch_id IS NOT NULL THEN
    SELECT expiry_date, quantity INTO _exp, _bqty FROM public.product_batches WHERE id = NEW.batch_id;
    IF _exp IS NOT NULL AND _exp < CURRENT_DATE THEN RAISE EXCEPTION 'This batch is expired and cannot be sold'; END IF;
    IF _bqty < NEW.quantity THEN RAISE EXCEPTION 'Not enough quantity in the selected batch'; END IF;
    UPDATE public.product_batches SET quantity = quantity - NEW.quantity::integer WHERE id = NEW.batch_id;
  END IF;
  SELECT stock_qty INTO _sqty FROM public.products WHERE id = NEW.product_id;
  IF _sqty < NEW.quantity THEN RAISE EXCEPTION 'Not enough stock for this item'; END IF;
  INSERT INTO public.stock_movements (product_id, change_qty, reason, reference_id, batch_no, created_by)
  SELECT NEW.product_id, -NEW.quantity::integer, 'sale', NEW.invoice_id,
         (SELECT batch_no FROM public.product_batches WHERE id = NEW.batch_id), auth.uid();
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_invoice_item_stock ON public.invoice_items;
CREATE TRIGGER trg_invoice_item_stock AFTER INSERT ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.invoice_item_stock();

-- ===== optical orders =====
CREATE TABLE IF NOT EXISTS public.optical_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  optical_prescription_id uuid REFERENCES public.optical_prescriptions(id),
  invoice_id uuid REFERENCES public.invoices(id),
  frame_product_id uuid REFERENCES public.products(id),
  lens_product_id uuid REFERENCES public.products(id),
  brand text, lens_index text, coating text,
  quantity integer NOT NULL DEFAULT 1,
  cost_price numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ordered',
  delivery_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.optical_orders TO authenticated;
GRANT ALL ON public.optical_orders TO service_role;
ALTER TABLE public.optical_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_read_optical_orders ON public.optical_orders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) AND public.same_branch(branch_id));
CREATE POLICY patient_self_optical_orders ON public.optical_orders FOR SELECT TO authenticated USING (public.owns_patient(patient_id));
CREATE POLICY finance_write_optical_orders ON public.optical_orders FOR INSERT TO authenticated WITH CHECK (public.is_finance(auth.uid()));
CREATE POLICY finance_update_optical_orders ON public.optical_orders FOR UPDATE TO authenticated USING (public.is_finance(auth.uid())) WITH CHECK (public.is_finance(auth.uid()));
CREATE POLICY admin_delete_optical_orders ON public.optical_orders FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_optical_orders_updated BEFORE UPDATE ON public.optical_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_optical_orders_patient ON public.optical_orders (patient_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.optical_order_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _q integer;
BEGIN
  IF NEW.frame_product_id IS NOT NULL THEN
    SELECT stock_qty INTO _q FROM public.products WHERE id = NEW.frame_product_id;
    IF _q < NEW.quantity THEN RAISE EXCEPTION 'Selected frame is out of stock'; END IF;
    INSERT INTO public.stock_movements (product_id, branch_id, change_qty, reason, reference_id, created_by)
    VALUES (NEW.frame_product_id, NEW.branch_id, -NEW.quantity, 'optical_order', NEW.id, auth.uid());
  END IF;
  IF NEW.lens_product_id IS NOT NULL THEN
    SELECT stock_qty INTO _q FROM public.products WHERE id = NEW.lens_product_id;
    IF _q < NEW.quantity THEN RAISE EXCEPTION 'Selected lens is out of stock'; END IF;
    INSERT INTO public.stock_movements (product_id, branch_id, change_qty, reason, reference_id, created_by)
    VALUES (NEW.lens_product_id, NEW.branch_id, -NEW.quantity, 'optical_order', NEW.id, auth.uid());
  END IF;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_optical_order_stock ON public.optical_orders;
CREATE TRIGGER trg_optical_order_stock AFTER INSERT ON public.optical_orders
FOR EACH ROW EXECUTE FUNCTION public.optical_order_stock();

-- ===== patient documents =====
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES public.visits(id),
  surgery_id uuid REFERENCES public.surgeries(id),
  doc_type text NOT NULL,
  title text NOT NULL,
  file_url text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_documents TO authenticated;
GRANT ALL ON public.patient_documents TO service_role;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_read_docs ON public.patient_documents FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY patient_self_docs ON public.patient_documents FOR SELECT TO authenticated USING (public.owns_patient(patient_id));
CREATE POLICY staff_write_docs ON public.patient_documents FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY staff_update_docs ON public.patient_documents FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY admin_delete_docs ON public.patient_documents FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_docs_patient ON public.patient_documents (patient_id, created_at DESC);

-- ===== lead activities =====
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity text NOT NULL,
  outcome text,
  next_action_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_all_lead_activities ON public.lead_activities FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS campaign text;

-- ===== insurance claim history =====
CREATE TABLE IF NOT EXISTS public.claim_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.claim_status_history TO authenticated;
GRANT ALL ON public.claim_status_history TO service_role;
ALTER TABLE public.claim_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_read_claim_hist ON public.claim_status_history FOR SELECT TO authenticated USING (public.is_finance(auth.uid()));
CREATE POLICY finance_write_claim_hist ON public.claim_status_history FOR INSERT TO authenticated WITH CHECK (public.is_finance(auth.uid()));

CREATE OR REPLACE FUNCTION public.claim_status_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.claim_status_history (claim_id, status, changed_by) VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_claim_status ON public.insurance_claims;
CREATE TRIGGER trg_claim_status AFTER INSERT OR UPDATE ON public.insurance_claims
FOR EACH ROW EXECUTE FUNCTION public.claim_status_log();