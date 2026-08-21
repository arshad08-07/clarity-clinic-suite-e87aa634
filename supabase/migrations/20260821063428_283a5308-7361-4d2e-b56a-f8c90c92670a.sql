ALTER TABLE public.patients ALTER COLUMN mrn SET DEFAULT public.next_mrn();

CREATE OR REPLACE FUNCTION public.patient_mrn_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.mrn IS NULL OR btrim(NEW.mrn) = '' THEN
      NEW.mrn := public.next_mrn();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- MRN is immutable once issued
    IF NEW.mrn IS DISTINCT FROM OLD.mrn THEN
      NEW.mrn := OLD.mrn;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_mrn_guard ON public.patients;
CREATE TRIGGER trg_patient_mrn_guard
BEFORE INSERT OR UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.patient_mrn_guard();