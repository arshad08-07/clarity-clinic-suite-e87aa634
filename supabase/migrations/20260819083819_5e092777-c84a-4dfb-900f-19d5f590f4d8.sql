-- 1. FOLLOW-UPS: status is authoritative, is_done strictly derived
CREATE OR REPLACE FUNCTION public.follow_up_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT COALESCE(v.branch_id, s.branch_id, p.branch_id) INTO NEW.branch_id
    FROM public.patients p
    LEFT JOIN public.visits v ON v.id = NEW.visit_id
    LEFT JOIN public.surgeries s ON s.id = NEW.surgery_id
    WHERE p.id = NEW.patient_id;
  END IF;

  IF NEW.doctor_id IS NULL THEN
    SELECT COALESCE(v.doctor_id, s.surgeon_id, NEW.assigned_to) INTO NEW.doctor_id
    FROM public.patients p
    LEFT JOIN public.visits v ON v.id = NEW.visit_id
    LEFT JOIN public.surgeries s ON s.id = NEW.surgery_id
    WHERE p.id = NEW.patient_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    IF NEW.status IS NULL OR NEW.status = '' THEN NEW.status := 'upcoming'; END IF;
    IF NOT NEW.allow_duplicate AND EXISTS (
      SELECT 1 FROM public.follow_ups f
      WHERE f.patient_id = NEW.patient_id
        AND f.due_date = NEW.due_date
        AND f.status = 'upcoming'
    ) THEN
      RAISE EXCEPTION 'An active follow-up already exists for this patient on %', to_char(NEW.due_date, 'DD Mon YYYY');
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    RAISE EXCEPTION 'A completed follow-up cannot be reopened';
  END IF;

  -- is_done is a derived mirror of status; direct writes are ignored
  NEW.is_done := (NEW.status = 'completed');

  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN NEW.completed_at := now(); END IF;
  IF NEW.status <> 'completed' THEN NEW.completed_at := NULL; END IF;

  RETURN NEW;
END;
$$;

UPDATE public.follow_ups SET is_done = (status = 'completed')
 WHERE is_done IS DISTINCT FROM (status = 'completed');

COMMENT ON COLUMN public.follow_ups.is_done IS
  'Derived mirror of status = ''completed''. Read-only: maintained by follow_up_guard.';
COMMENT ON COLUMN public.follow_ups.status IS
  'Single source of truth: upcoming | completed | cancelled | no_show (due/overdue derived from due_date).';

-- 2. VISITS.department: always written
UPDATE public.visits SET department = 'general' WHERE department IS NULL OR btrim(department) = '';
ALTER TABLE public.visits ALTER COLUMN department SET DEFAULT 'general';

CREATE OR REPLACE FUNCTION public.visit_department_stamp()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.department IS NULL OR btrim(NEW.department) = '' THEN
    NEW.department := COALESCE(
      (SELECT NULLIF(btrim(a.appointment_type), '') FROM public.appointments a WHERE a.id = NEW.appointment_id),
      'general');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visit_department ON public.visits;
CREATE TRIGGER trg_visit_department BEFORE INSERT OR UPDATE OF department, appointment_id ON public.visits
FOR EACH ROW EXECUTE FUNCTION public.visit_department_stamp();

ALTER TABLE public.visits ALTER COLUMN department SET NOT NULL;

-- 3. DEAD SETTINGS: remove the stray clinic_profile row
DELETE FROM public.settings WHERE key = 'clinic_profile';

-- 4. FOREIGN KEY INDEXES for high-traffic relations
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON public.invoice_items(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_items_batch ON public.invoice_items(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pharmacy_sales_product ON public.pharmacy_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_sales_batch ON public.pharmacy_sales(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pharmacy_sales_invoice ON public.pharmacy_sales(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pharmacy_sales_branch ON public.pharmacy_sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_branch ON public.stock_movements(branch_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_visit ON public.follow_ups(visit_id) WHERE visit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_follow_ups_surgery ON public.follow_ups(surgery_id) WHERE surgery_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_follow_ups_branch_status_due ON public.follow_ups(branch_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned ON public.follow_ups(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_surgeries_branch ON public.surgeries(branch_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_ot_room ON public.surgeries(ot_room_id) WHERE ot_room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_surgeries_iol_inventory ON public.surgeries(iol_inventory_id) WHERE iol_inventory_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_branch_time ON public.appointments(branch_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON public.purchase_order_items(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_branch ON public.purchase_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON public.goods_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_supplier ON public.goods_receipts(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_product ON public.goods_receipt_items(product_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_poi ON public.goods_receipt_items(purchase_order_item_id) WHERE purchase_order_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_txn_supplier_date ON public.supplier_transactions(supplier_id, txn_date);
CREATE INDEX IF NOT EXISTS idx_supplier_txn_po ON public.supplier_transactions(purchase_order_id) WHERE purchase_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_batches_branch ON public.product_batches(branch_id);
CREATE INDEX IF NOT EXISTS idx_optical_orders_branch ON public.optical_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_optical_orders_invoice ON public.optical_orders(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_optical_orders_rx ON public.optical_orders(optical_prescription_id) WHERE optical_prescription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_optical_rx_patient ON public.optical_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_optical_rx_visit ON public.optical_prescriptions(visit_id) WHERE visit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diag_orders_test ON public.diagnostic_orders(test_id) WHERE test_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_diagnosis ON public.patient_diagnoses(diagnosis_id) WHERE diagnosis_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_branch ON public.patient_diagnoses(branch_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_diagnosis ON public.prescription_items(diagnosis_id) WHERE diagnosis_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON public.lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_branch_status ON public.leads(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_communications_patient ON public.communications(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_communications_lead ON public.communications(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_communications_branch ON public.communications(branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient ON public.payments(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insurance_claims_invoice ON public.insurance_claims(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insurance_claims_patient ON public.insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claim_status_history_claim ON public.claim_status_history(claim_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_date ON public.expenses(branch_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_iol_inventory_branch ON public.iol_inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_iol_inventory_model ON public.iol_inventory(iol_model_id);
CREATE INDEX IF NOT EXISTS idx_equipment_branch ON public.equipment(branch_id);
CREATE INDEX IF NOT EXISTS idx_ot_rooms_branch ON public.ot_rooms(branch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_branch ON public.profiles(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patient_documents_visit ON public.patient_documents(visit_id) WHERE visit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patient_documents_surgery ON public.patient_documents(surgery_id) WHERE surgery_id IS NOT NULL;
