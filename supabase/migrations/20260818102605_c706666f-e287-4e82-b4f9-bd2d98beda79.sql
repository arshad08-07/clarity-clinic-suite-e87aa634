
-- 1. Schema -------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ALTER COLUMN patient_id DROP NOT NULL;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS lead_campaign text,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_appointments_lead ON public.appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_patients_lead ON public.patients(lead_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_leads_converted_patient ON public.leads(converted_patient_id);

-- every appointment must belong to a patient or to a lead
CREATE OR REPLACE FUNCTION public.appointment_subject_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.patient_id IS NULL AND NEW.lead_id IS NULL THEN
    RAISE EXCEPTION 'An appointment needs either a patient or a lead';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_appointment_subject_guard ON public.appointments;
CREATE TRIGGER trg_appointment_subject_guard
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointment_subject_guard();

-- 2. Who may convert ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_convert_leads(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'super_admin')
      OR public.has_role(_user_id, 'clinic_admin')
      OR public.has_role(_user_id, 'receptionist')
      OR public.has_role(_user_id, 'crm_staff');
$$;

-- 3. Duplicate detection ------------------------------------------------
CREATE OR REPLACE FUNCTION public.lead_patient_matches(_lead_id uuid)
RETURNS TABLE(patient_id uuid, mrn text, full_name text, phone text, email text, branch_id uuid, match_on text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.leads;
BEGIN
  SELECT * INTO l FROM public.leads WHERE id = _lead_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT public.is_staff(auth.uid()) OR NOT public.can_access_branch(l.branch_id) THEN
    RAISE EXCEPTION 'Not allowed to view this lead';
  END IF;

  RETURN QUERY
  SELECT p.id, p.mrn, trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')),
         p.phone, p.email, p.branch_id,
         CASE
           WHEN regexp_replace(coalesce(p.phone,''),'\D','','g') = regexp_replace(coalesce(l.phone,''),'\D','','g')
                AND length(regexp_replace(coalesce(l.phone,''),'\D','','g')) >= 6
             THEN 'phone'
           ELSE 'email'
         END
  FROM public.patients p
  WHERE public.can_access_branch(p.branch_id)
    AND (
      (length(regexp_replace(coalesce(l.phone,''),'\D','','g')) >= 6
        AND regexp_replace(coalesce(p.phone,''),'\D','','g') = regexp_replace(l.phone,'\D','','g'))
      OR (l.email IS NOT NULL AND l.email <> '' AND lower(coalesce(p.email,'')) = lower(l.email))
    )
  ORDER BY p.created_at;
END $$;

-- 4. Conversion ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convert_lead_to_patient(
  _lead_id uuid,
  _patient_id uuid DEFAULT NULL,
  _create_new boolean DEFAULT false
) RETURNS public.patients
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l public.leads;
  p public.patients;
  match_count integer;
  target uuid;
  first_nm text;
  last_nm text;
BEGIN
  SELECT * INTO l FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;

  IF NOT public.can_convert_leads(auth.uid()) THEN
    RAISE EXCEPTION 'Your role cannot convert leads';
  END IF;
  IF NOT public.can_access_branch(l.branch_id) THEN
    RAISE EXCEPTION 'This lead belongs to another branch';
  END IF;

  -- already converted: idempotent
  IF l.converted_patient_id IS NOT NULL THEN
    SELECT * INTO p FROM public.patients WHERE id = l.converted_patient_id;
    IF FOUND THEN
      UPDATE public.appointments SET patient_id = p.id
        WHERE lead_id = l.id AND patient_id IS NULL;
      RETURN p;
    END IF;
  END IF;

  target := _patient_id;

  IF target IS NULL THEN
    SELECT count(*) INTO match_count FROM public.lead_patient_matches(l.id);
    IF match_count = 1 AND NOT _create_new THEN
      SELECT m.patient_id INTO target FROM public.lead_patient_matches(l.id) m LIMIT 1;
    ELSIF match_count > 1 AND NOT _create_new THEN
      RAISE EXCEPTION 'DUPLICATE_MATCH: % existing patients share this phone or email — pick one or force a new record', match_count;
    END IF;
  END IF;

  IF target IS NOT NULL THEN
    SELECT * INTO p FROM public.patients WHERE id = target;
    IF NOT FOUND THEN RAISE EXCEPTION 'Selected patient not found'; END IF;
    IF NOT public.can_access_branch(p.branch_id) THEN
      RAISE EXCEPTION 'Selected patient belongs to another branch';
    END IF;
    UPDATE public.patients
       SET lead_id = coalesce(lead_id, l.id),
           lead_source = coalesce(lead_source, l.source),
           lead_campaign = coalesce(lead_campaign, l.campaign),
           converted_at = coalesce(converted_at, now()),
           email = coalesce(email, nullif(l.email,'')),
           referred_by = coalesce(referred_by, l.source)
     WHERE id = p.id
     RETURNING * INTO p;
  ELSE
    first_nm := split_part(trim(l.name), ' ', 1);
    last_nm := nullif(trim(substring(trim(l.name) from position(' ' in trim(l.name)) + 1)), first_nm);
    INSERT INTO public.patients (
      mrn, branch_id, first_name, last_name, phone, email,
      lead_id, lead_source, lead_campaign, converted_at, referred_by, medical_history
    ) VALUES (
      public.next_mrn(), l.branch_id, coalesce(nullif(first_nm,''), l.name), nullif(last_nm,''),
      l.phone, nullif(l.email,''), l.id, l.source, l.campaign, now(), l.source,
      nullif(l.notes,'')
    ) RETURNING * INTO p;
  END IF;

  UPDATE public.leads
     SET converted_patient_id = p.id,
         status = 'converted',
         updated_at = now()
   WHERE id = l.id;

  UPDATE public.appointments
     SET patient_id = p.id
   WHERE lead_id = l.id AND patient_id IS NULL;

  INSERT INTO public.lead_activities (lead_id, activity, outcome, created_by)
  VALUES (l.id, 'Converted to patient',
          'Linked to ' || p.mrn || ' (' || trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')) || ')',
          auth.uid());

  RETURN p;
END $$;

REVOKE ALL ON FUNCTION public.convert_lead_to_patient(uuid, uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_patient(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_patient_matches(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_convert_leads(uuid) TO authenticated;

-- 5. CRM funnel report --------------------------------------------------
CREATE OR REPLACE FUNCTION public.crm_funnel(_from date, _to date)
RETURNS TABLE(
  source text, campaign text,
  leads bigint, contacted bigint, appointments bigint,
  patients bigint, visits bigint, surgeries bigint, revenue numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH l AS (
    SELECT * FROM public.leads
    WHERE public.is_staff(auth.uid()) AND public.can_access_branch(branch_id)
      AND created_at::date BETWEEN _from AND _to
  )
  SELECT coalesce(l.source,'unknown') AS source,
         coalesce(l.campaign,'—') AS campaign,
         count(*)::bigint,
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.lead_activities a WHERE a.lead_id = l.id))::bigint,
         count(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM public.appointments ap
              WHERE ap.lead_id = l.id OR (l.converted_patient_id IS NOT NULL AND ap.patient_id = l.converted_patient_id)))::bigint,
         count(*) FILTER (WHERE l.converted_patient_id IS NOT NULL)::bigint,
         count(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM public.visits v WHERE v.patient_id = l.converted_patient_id))::bigint,
         count(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM public.surgeries s WHERE s.patient_id = l.converted_patient_id))::bigint,
         coalesce(sum((SELECT coalesce(sum(i.paid_amount),0) FROM public.invoices i
                        WHERE i.patient_id = l.converted_patient_id)),0)::numeric
  FROM l
  GROUP BY 1,2
  ORDER BY 3 DESC;
$$;

GRANT EXECUTE ON FUNCTION public.crm_funnel(date, date) TO authenticated;
