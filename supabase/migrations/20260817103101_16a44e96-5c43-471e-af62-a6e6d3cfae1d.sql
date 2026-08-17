-- helpers
CREATE OR REPLACE FUNCTION public.is_clinical(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('super_admin','clinic_admin','doctor','optometrist','nurse','diagnostic_staff'))
$$;

CREATE OR REPLACE FUNCTION public.is_finance(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('super_admin','clinic_admin','accountant','receptionist','pharmacist','optical_staff','inventory_manager'))
$$;

CREATE OR REPLACE FUNCTION public.same_branch(_branch uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _branch IS NULL
      OR public.is_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
                 AND (p.branch_id IS NULL OR p.branch_id = _branch))
$$;

CREATE OR REPLACE FUNCTION public.owns_patient(_patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.patients p WHERE p.id = _patient_id AND p.user_id = auth.uid())
$$;

REVOKE EXECUTE ON FUNCTION public.is_clinical(uuid), public.is_finance(uuid),
  public.same_branch(uuid), public.owns_patient(uuid), public.is_admin(uuid),
  public.is_staff(uuid), public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_clinical(uuid), public.is_finance(uuid),
  public.same_branch(uuid), public.owns_patient(uuid), public.is_admin(uuid),
  public.is_staff(uuid), public.has_role(uuid, public.app_role) TO authenticated;

-- ===== clinical tables: staff read, clinical-only write =====
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['optometry_records','examinations','patient_diagnoses','prescriptions','prescription_items','optical_prescriptions','diagnostic_orders'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS staff_write_%1$s ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS staff_update_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE POLICY clinical_insert_%1$s ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.is_clinical(auth.uid()))', t);
    EXECUTE format('CREATE POLICY clinical_update_%1$s ON public.%1$I FOR UPDATE TO authenticated USING (public.is_clinical(auth.uid())) WITH CHECK (public.is_clinical(auth.uid()))', t);
  END LOOP;
END $$;

-- ===== financial tables: finance-only =====
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['invoices','invoice_items','payments','expenses','insurance_claims','purchase_orders','purchase_order_items'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS staff_write_%1$s ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS staff_update_%1$s ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS staff_read_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE POLICY finance_insert_%1$s ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.is_finance(auth.uid()))', t);
    EXECUTE format('CREATE POLICY finance_update_%1$s ON public.%1$I FOR UPDATE TO authenticated USING (public.is_finance(auth.uid())) WITH CHECK (public.is_finance(auth.uid()))', t);
  END LOOP;
END $$;

CREATE POLICY finance_read_invoices ON public.invoices FOR SELECT TO authenticated
  USING (public.is_finance(auth.uid()) AND public.same_branch(branch_id));
CREATE POLICY finance_read_invoice_items ON public.invoice_items FOR SELECT TO authenticated
  USING (public.is_finance(auth.uid()));
CREATE POLICY finance_read_payments ON public.payments FOR SELECT TO authenticated
  USING (public.is_finance(auth.uid()));
CREATE POLICY finance_read_expenses ON public.expenses FOR SELECT TO authenticated
  USING (public.is_finance(auth.uid()));
CREATE POLICY finance_read_claims ON public.insurance_claims FOR SELECT TO authenticated
  USING (public.is_finance(auth.uid()));
CREATE POLICY finance_read_po ON public.purchase_orders FOR SELECT TO authenticated
  USING (public.is_finance(auth.uid()));
CREATE POLICY finance_read_po_items ON public.purchase_order_items FOR SELECT TO authenticated
  USING (public.is_finance(auth.uid()));

-- ===== branch scoping on core records =====
DROP POLICY IF EXISTS staff_read_patients ON public.patients;
CREATE POLICY staff_read_patients ON public.patients FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) AND public.same_branch(branch_id));

DROP POLICY IF EXISTS staff_read_appointments ON public.appointments;
CREATE POLICY staff_read_appointments ON public.appointments FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) AND public.same_branch(branch_id));

DROP POLICY IF EXISTS staff_read_visits ON public.visits;
CREATE POLICY staff_read_visits ON public.visits FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) AND public.same_branch(branch_id));

-- ===== patient portal reads =====
CREATE POLICY patient_self_visits ON public.visits FOR SELECT TO authenticated USING (public.owns_patient(patient_id));
CREATE POLICY patient_self_diag_orders ON public.diagnostic_orders FOR SELECT TO authenticated USING (public.owns_patient(patient_id));
CREATE POLICY patient_self_surgeries ON public.surgeries FOR SELECT TO authenticated USING (public.owns_patient(patient_id));
CREATE POLICY patient_self_followups ON public.follow_ups FOR SELECT TO authenticated USING (public.owns_patient(patient_id));
CREATE POLICY patient_self_optical_rx ON public.optical_prescriptions FOR SELECT TO authenticated USING (public.owns_patient(patient_id));
CREATE POLICY patient_self_diagnoses ON public.patient_diagnoses FOR SELECT TO authenticated USING (public.owns_patient(patient_id));
CREATE POLICY patient_self_payments ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = payments.invoice_id AND public.owns_patient(i.patient_id)));