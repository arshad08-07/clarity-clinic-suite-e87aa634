
-- Least-privilege clinical read helpers
CREATE OR REPLACE FUNCTION public.can_read_clinical(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('super_admin','clinic_admin','doctor','optometrist','nurse','diagnostic_staff'))
$$;

CREATE OR REPLACE FUNCTION public.can_read_medication(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('super_admin','clinic_admin','doctor','optometrist','nurse','pharmacist'))
$$;

CREATE OR REPLACE FUNCTION public.can_read_optical_rx(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('super_admin','clinic_admin','doctor','optometrist','optical_staff'))
$$;

-- Examinations: clinical roles only
DROP POLICY IF EXISTS staff_read_examinations ON public.examinations;
CREATE POLICY clinical_read_examinations ON public.examinations FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid()) AND public.can_access_patient(patient_id));

-- Optometry records: clinical roles only
DROP POLICY IF EXISTS staff_read_optometry_records ON public.optometry_records;
CREATE POLICY clinical_read_optometry_records ON public.optometry_records FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid()) AND public.can_access_patient(patient_id));

-- Diagnoses: clinical roles only
DROP POLICY IF EXISTS staff_read_patient_diagnoses ON public.patient_diagnoses;
CREATE POLICY clinical_read_patient_diagnoses ON public.patient_diagnoses FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid()) AND public.can_access_patient(patient_id));

-- Diagnostic orders: clinical roles only (includes diagnostic_staff)
DROP POLICY IF EXISTS staff_read_diagnostic_orders ON public.diagnostic_orders;
CREATE POLICY clinical_read_diagnostic_orders ON public.diagnostic_orders FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid()) AND public.can_access_patient(patient_id));

-- Prescriptions + items: clinical prescribers + pharmacist (dispensing need)
DROP POLICY IF EXISTS staff_read_prescriptions ON public.prescriptions;
CREATE POLICY medication_read_prescriptions ON public.prescriptions FOR SELECT TO authenticated
  USING (public.can_read_medication(auth.uid()) AND public.can_access_patient(patient_id));

DROP POLICY IF EXISTS staff_read_prescription_items ON public.prescription_items;
CREATE POLICY medication_read_prescription_items ON public.prescription_items FOR SELECT TO authenticated
  USING (public.can_read_medication(auth.uid()) AND public.can_access_prescription(prescription_id));

-- Optical prescriptions: clinical prescribers + optical staff
DROP POLICY IF EXISTS staff_read_optical_prescriptions ON public.optical_prescriptions;
CREATE POLICY optical_read_optical_prescriptions ON public.optical_prescriptions FOR SELECT TO authenticated
  USING (public.can_read_optical_rx(auth.uid()) AND public.can_access_patient(patient_id));

-- Patient documents: clinical docs restricted; administrative docs remain staff-visible
DROP POLICY IF EXISTS staff_read_docs ON public.patient_documents;
CREATE POLICY scoped_read_docs ON public.patient_documents FOR SELECT TO authenticated
  USING (
    public.can_access_patient(patient_id)
    AND (
      public.can_read_clinical(auth.uid())
      OR (public.is_staff(auth.uid()) AND doc_type IN ('consent','invoice','receipt','id_proof','insurance','other'))
    )
  );
DROP POLICY IF EXISTS staff_update_docs ON public.patient_documents;
CREATE POLICY scoped_update_docs ON public.patient_documents FOR UPDATE TO authenticated
  USING (
    public.can_access_patient(patient_id)
    AND (public.can_read_clinical(auth.uid()) OR public.is_finance(auth.uid()))
  );
