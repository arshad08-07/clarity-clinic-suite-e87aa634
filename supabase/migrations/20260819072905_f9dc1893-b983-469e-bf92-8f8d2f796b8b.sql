
ALTER TABLE public.patient_diagnoses
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);

UPDATE public.patient_diagnoses d
SET branch_id = v.branch_id
FROM public.visits v
WHERE d.visit_id = v.id AND d.branch_id IS NULL AND v.branch_id IS NOT NULL;

ALTER TABLE public.prescription_items
  ADD COLUMN IF NOT EXISTS diagnosis_id uuid REFERENCES public.patient_diagnoses(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.patient_diagnosis_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient uuid;
  v_branch uuid;
BEGIN
  IF NEW.patient_id IS NULL THEN
    RAISE EXCEPTION 'A diagnosis must belong to a patient';
  END IF;
  IF NEW.visit_id IS NULL THEN
    RAISE EXCEPTION 'A diagnosis must be recorded against a visit';
  END IF;

  SELECT patient_id, branch_id INTO v_patient, v_branch FROM public.visits WHERE id = NEW.visit_id;
  IF v_patient IS NULL THEN
    RAISE EXCEPTION 'Visit % does not exist', NEW.visit_id;
  END IF;
  IF v_patient <> NEW.patient_id THEN
    RAISE EXCEPTION 'This visit belongs to a different patient';
  END IF;

  IF NEW.diagnosis_id IS NULL AND (NEW.diagnosis_text IS NULL OR btrim(NEW.diagnosis_text) = '') THEN
    RAISE EXCEPTION 'Select a diagnosis code or enter diagnosis text';
  END IF;

  IF NEW.diagnosis_text IS NOT NULL THEN
    NEW.diagnosis_text := btrim(NEW.diagnosis_text);
  END IF;

  NEW.branch_id := COALESCE(v_branch, NEW.branch_id);
  IF NEW.diagnosed_by IS NULL THEN
    NEW.diagnosed_by := auth.uid();
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.patient_id <> OLD.patient_id OR NEW.visit_id IS DISTINCT FROM OLD.visit_id THEN
      RAISE EXCEPTION 'A diagnosis cannot be moved to another patient or visit';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_diagnosis_guard ON public.patient_diagnoses;
CREATE TRIGGER trg_patient_diagnosis_guard
BEFORE INSERT OR UPDATE ON public.patient_diagnoses
FOR EACH ROW EXECUTE FUNCTION public.patient_diagnosis_guard();

CREATE UNIQUE INDEX IF NOT EXISTS patient_diagnoses_visit_coded_uniq
  ON public.patient_diagnoses (visit_id, diagnosis_id, eye) NULLS NOT DISTINCT
  WHERE diagnosis_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS patient_diagnoses_visit_text_uniq
  ON public.patient_diagnoses (visit_id, diagnosis_text, eye) NULLS NOT DISTINCT
  WHERE diagnosis_id IS NULL AND diagnosis_text IS NOT NULL;

CREATE INDEX IF NOT EXISTS patient_diagnoses_patient_created_idx
  ON public.patient_diagnoses (patient_id, created_at DESC);
