-- ============ 1. schema additions ============
ALTER TABLE public.surgeries
  ADD COLUMN IF NOT EXISTS duration_min integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS assistant_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS nurse_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS consumables text;

-- ============ 2. no double booking (doctor) ============
CREATE OR REPLACE FUNCTION public.check_appointment_conflict()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.doctor_id IS NULL OR NEW.status IN ('cancelled','no_show') THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.doctor_id = NEW.doctor_id
      AND a.id <> NEW.id
      AND a.status NOT IN ('cancelled','no_show','completed')
      AND tstzrange(a.scheduled_at, a.scheduled_at + make_interval(mins => a.duration_min))
          && tstzrange(NEW.scheduled_at, NEW.scheduled_at + make_interval(mins => NEW.duration_min))
  ) THEN
    RAISE EXCEPTION 'This doctor already has an appointment in that time slot';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_appt_conflict ON public.appointments;
CREATE TRIGGER trg_appt_conflict BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.check_appointment_conflict();

-- ============ 3. no OT / surgeon double booking ============
CREATE OR REPLACE FUNCTION public.check_surgery_conflict()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.scheduled_at IS NULL OR NEW.status IN ('cancelled','postponed') THEN RETURN NEW; END IF;
  IF NEW.ot_room_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.surgeries s
    WHERE s.ot_room_id = NEW.ot_room_id AND s.id <> NEW.id
      AND s.scheduled_at IS NOT NULL AND s.status NOT IN ('cancelled','postponed')
      AND tstzrange(s.scheduled_at, s.scheduled_at + make_interval(mins => s.duration_min))
          && tstzrange(NEW.scheduled_at, NEW.scheduled_at + make_interval(mins => NEW.duration_min))
  ) THEN RAISE EXCEPTION 'That operating room is already booked for this time'; END IF;

  IF NEW.surgeon_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.surgeries s
    WHERE s.surgeon_id = NEW.surgeon_id AND s.id <> NEW.id
      AND s.scheduled_at IS NOT NULL AND s.status NOT IN ('cancelled','postponed')
      AND tstzrange(s.scheduled_at, s.scheduled_at + make_interval(mins => s.duration_min))
          && tstzrange(NEW.scheduled_at, NEW.scheduled_at + make_interval(mins => NEW.duration_min))
  ) THEN RAISE EXCEPTION 'That surgeon is already booked for this time'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_surgery_conflict ON public.surgeries;
CREATE TRIGGER trg_surgery_conflict BEFORE INSERT OR UPDATE ON public.surgeries
FOR EACH ROW EXECUTE FUNCTION public.check_surgery_conflict();

-- ============ 4. queue token + auto visit on check-in ============
CREATE OR REPLACE FUNCTION public.assign_visit_token()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.token_no IS NULL THEN
    SELECT COALESCE(MAX(v.token_no), 0) + 1 INTO NEW.token_no
    FROM public.visits v
    WHERE v.checked_in_at::date = COALESCE(NEW.checked_in_at, now())::date
      AND v.branch_id IS NOT DISTINCT FROM NEW.branch_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_visit_token ON public.visits;
CREATE TRIGGER trg_visit_token BEFORE INSERT ON public.visits
FOR EACH ROW EXECUTE FUNCTION public.assign_visit_token();

CREATE OR REPLACE FUNCTION public.appointment_checkin_visit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'checked_in' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'checked_in') THEN
    IF NOT EXISTS (SELECT 1 FROM public.visits v WHERE v.appointment_id = NEW.id) THEN
      INSERT INTO public.visits (branch_id, patient_id, appointment_id, doctor_id, status, chief_complaint)
      VALUES (NEW.branch_id, NEW.patient_id, NEW.id, NEW.doctor_id, 'waiting', NEW.reason);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_appt_checkin ON public.appointments;
CREATE TRIGGER trg_appt_checkin AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.appointment_checkin_visit();

-- ============ 5. invoice totals + payment status ============
CREATE OR REPLACE FUNCTION public.recalc_invoice(_invoice_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sub numeric := 0; _tax numeric := 0; _disc numeric := 0; _paid numeric := 0; _total numeric := 0;
BEGIN
  SELECT COALESCE(SUM(quantity * unit_price),0),
         COALESCE(SUM(quantity * unit_price * tax_percent / 100),0)
    INTO _sub, _tax
  FROM public.invoice_items WHERE invoice_id = _invoice_id;

  SELECT COALESCE(discount,0) INTO _disc FROM public.invoices WHERE id = _invoice_id;
  SELECT COALESCE(SUM(amount),0) INTO _paid FROM public.payments WHERE invoice_id = _invoice_id;

  IF _sub = 0 THEN
    SELECT subtotal, tax INTO _sub, _tax FROM public.invoices WHERE id = _invoice_id;
  END IF;
  _total := GREATEST(COALESCE(_sub,0) + COALESCE(_tax,0) - COALESCE(_disc,0), 0);

  UPDATE public.invoices SET
    subtotal = COALESCE(_sub,0), tax = COALESCE(_tax,0), total = _total, paid_amount = _paid,
    status = CASE
      WHEN _paid <= 0 THEN 'unpaid'::payment_status
      WHEN _paid + 0.009 >= _total THEN 'paid'::payment_status
      ELSE 'partial'::payment_status END
  WHERE id = _invoice_id;
END; $$;

CREATE OR REPLACE FUNCTION public.invoice_items_sync()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP <> 'DELETE' THEN
    NEW.amount := NEW.quantity * NEW.unit_price * (1 + COALESCE(NEW.tax_percent,0)/100);
    RETURN NEW;
  END IF;
  RETURN OLD;
END; $$;
DROP TRIGGER IF EXISTS trg_invoice_item_amount ON public.invoice_items;
CREATE TRIGGER trg_invoice_item_amount BEFORE INSERT OR UPDATE ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.invoice_items_sync();

CREATE OR REPLACE FUNCTION public.invoice_items_after()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM public.recalc_invoice(COALESCE(NEW.invoice_id, OLD.invoice_id));
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_invoice_item_recalc ON public.invoice_items;
CREATE TRIGGER trg_invoice_item_recalc AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.invoice_items_after();

CREATE OR REPLACE FUNCTION public.payment_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _total numeric; _paid numeric;
BEGIN
  IF NEW.amount = 0 THEN RAISE EXCEPTION 'Payment amount cannot be zero'; END IF;
  SELECT total INTO _total FROM public.invoices WHERE id = NEW.invoice_id;
  SELECT COALESCE(SUM(amount),0) INTO _paid FROM public.payments
    WHERE invoice_id = NEW.invoice_id AND id <> COALESCE(NEW.id, gen_random_uuid());
  IF NEW.amount > 0 AND _paid + NEW.amount > COALESCE(_total,0) + 0.009 THEN
    RAISE EXCEPTION 'Payment exceeds the invoice balance';
  END IF;
  IF NEW.amount < 0 AND _paid + NEW.amount < -0.009 THEN
    RAISE EXCEPTION 'Refund exceeds the amount already paid';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_payment_validate ON public.payments;
CREATE TRIGGER trg_payment_validate BEFORE INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.payment_validate();

CREATE OR REPLACE FUNCTION public.payment_after()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM public.recalc_invoice(COALESCE(NEW.invoice_id, OLD.invoice_id));
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_payment_recalc ON public.payments;
CREATE TRIGGER trg_payment_recalc AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.payment_after();

-- ============ 6. stock movements keep product stock correct ============
CREATE OR REPLACE FUNCTION public.stock_movement_apply()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _new_qty integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT stock_qty + NEW.change_qty INTO _new_qty FROM public.products WHERE id = NEW.product_id FOR UPDATE;
    IF _new_qty < 0 THEN RAISE EXCEPTION 'Not enough stock for this movement'; END IF;
    UPDATE public.products SET stock_qty = _new_qty WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products SET stock_qty = GREATEST(stock_qty - OLD.change_qty, 0) WHERE id = OLD.product_id;
    RETURN OLD;
  ELSE
    UPDATE public.products SET stock_qty = GREATEST(stock_qty - OLD.change_qty, 0) WHERE id = OLD.product_id;
    SELECT stock_qty + NEW.change_qty INTO _new_qty FROM public.products WHERE id = NEW.product_id FOR UPDATE;
    IF _new_qty < 0 THEN RAISE EXCEPTION 'Not enough stock for this movement'; END IF;
    UPDATE public.products SET stock_qty = _new_qty WHERE id = NEW.product_id;
    RETURN NEW;
  END IF;
END; $$;
DROP TRIGGER IF EXISTS trg_stock_apply ON public.stock_movements;
CREATE TRIGGER trg_stock_apply AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.stock_movement_apply();

-- ============ 7. IOL consumption on surgery completion ============
CREATE OR REPLACE FUNCTION public.surgery_iol_consume()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.iol_inventory_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.iol_inventory_id IS DISTINCT FROM NEW.iol_inventory_id) THEN
    IF EXISTS (SELECT 1 FROM public.iol_inventory i WHERE i.id = NEW.iol_inventory_id AND i.is_used) THEN
      RAISE EXCEPTION 'That implant has already been used';
    END IF;
    IF EXISTS (SELECT 1 FROM public.iol_inventory i WHERE i.id = NEW.iol_inventory_id AND i.expiry_date < CURRENT_DATE) THEN
      RAISE EXCEPTION 'That implant is expired';
    END IF;
  END IF;

  IF NEW.status = 'completed' AND NEW.iol_inventory_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE public.iol_inventory SET is_used = true WHERE id = NEW.iol_inventory_id AND is_used = false;
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, details)
    VALUES (auth.uid(), 'iol_used', 'iol_inventory', NEW.iol_inventory_id,
            jsonb_build_object('surgery_id', NEW.id, 'patient_id', NEW.patient_id));
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_surgery_iol ON public.surgeries;
CREATE TRIGGER trg_surgery_iol BEFORE INSERT OR UPDATE ON public.surgeries
FOR EACH ROW EXECUTE FUNCTION public.surgery_iol_consume();

-- ============ 8. generic audit trail with old/new values ============
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _details jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _details := jsonb_build_object('new', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    IF to_jsonb(NEW) = to_jsonb(OLD) THEN RETURN NULL; END IF;
    _details := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSE
    _details := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, details)
  VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME,
          CASE WHEN TG_OP = 'DELETE' THEN (to_jsonb(OLD)->>'id')::uuid ELSE (to_jsonb(NEW)->>'id')::uuid END,
          _details);
  RETURN NULL;
END; $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['patients','appointments','visits','patient_diagnoses','prescriptions',
    'prescription_items','optometry_records','examinations','surgeries','invoices','invoice_items',
    'payments','stock_movements','user_roles','settings','diagnostic_orders','iol_inventory','insurance_claims']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t);
  END LOOP;
END $$;

-- ============ 9. indexes ============
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients (phone);
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON public.patients (mrn);
CREATE INDEX IF NOT EXISTS idx_patients_branch ON public.patients (branch_id);
CREATE INDEX IF NOT EXISTS idx_appt_patient ON public.appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_doctor_time ON public.appointments (doctor_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appt_time ON public.appointments (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON public.visits (patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_status ON public.visits (status, checked_in_at);
CREATE INDEX IF NOT EXISTS idx_optometry_patient ON public.optometry_records (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_optometry_visit ON public.optometry_records (visit_id);
CREATE INDEX IF NOT EXISTS idx_exam_patient ON public.examinations (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_visit ON public.examinations (visit_id);
CREATE INDEX IF NOT EXISTS idx_diag_patient ON public.patient_diagnoses (patient_id);
CREATE INDEX IF NOT EXISTS idx_diag_visit ON public.patient_diagnoses (visit_id);
CREATE INDEX IF NOT EXISTS idx_rx_patient ON public.prescriptions (patient_id);
CREATE INDEX IF NOT EXISTS idx_rx_visit ON public.prescriptions (visit_id);
CREATE INDEX IF NOT EXISTS idx_rx_items ON public.prescription_items (prescription_id);
CREATE INDEX IF NOT EXISTS idx_dorders_patient ON public.diagnostic_orders (patient_id);
CREATE INDEX IF NOT EXISTS idx_dorders_status ON public.diagnostic_orders (status);
CREATE INDEX IF NOT EXISTS idx_surgeries_patient ON public.surgeries (patient_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_sched ON public.surgeries (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.invoices (patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_no ON public.invoices (invoice_no);
CREATE INDEX IF NOT EXISTS idx_invoices_visit ON public.invoices (visit_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_stockmv_product ON public.stock_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_followups_due ON public.follow_ups (due_date, is_done);
CREATE INDEX IF NOT EXISTS idx_followups_patient ON public.follow_ups (patient_id);
CREATE INDEX IF NOT EXISTS idx_po_number ON public.purchase_orders (po_number);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs (entity, entity_id, created_at DESC);