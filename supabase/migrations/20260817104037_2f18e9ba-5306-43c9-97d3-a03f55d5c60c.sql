-- 1. Queue metadata on visits
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS on_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS called_at timestamptz,
  ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS department text;

-- 2. Duplicate protection: at most one non-cancelled visit per appointment
CREATE UNIQUE INDEX IF NOT EXISTS visits_one_active_per_appointment
  ON public.visits (appointment_id)
  WHERE appointment_id IS NOT NULL AND status <> 'cancelled';

CREATE INDEX IF NOT EXISTS visits_status_checked_in_idx ON public.visits (status, checked_in_at DESC);

-- 3. Stage transition validation + timestamp bookkeeping
CREATE OR REPLACE FUNCTION public.validate_visit_stage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE allowed text[];
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    allowed := CASE OLD.status::text
      WHEN 'waiting'     THEN ARRAY['optometry','with_doctor','cancelled']
      WHEN 'optometry'   THEN ARRAY['with_doctor','diagnostics','billing','waiting','cancelled']
      WHEN 'with_doctor' THEN ARRAY['diagnostics','billing','completed','optometry','cancelled']
      WHEN 'diagnostics' THEN ARRAY['with_doctor','billing','completed','cancelled']
      WHEN 'billing'     THEN ARRAY['completed','with_doctor','cancelled']
      WHEN 'completed'   THEN ARRAY[]::text[]
      WHEN 'cancelled'   THEN ARRAY[]::text[]
      ELSE ARRAY['waiting','optometry','with_doctor','diagnostics','billing','completed','cancelled']
    END;
    IF NOT (NEW.status::text = ANY(allowed)) THEN
      RAISE EXCEPTION 'Invalid queue transition: % -> %', OLD.status, NEW.status;
    END IF;
    NEW.stage_changed_at := now();
    IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
    IF NEW.status <> 'waiting' THEN
      NEW.on_hold := false;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_visit_stage ON public.visits;
CREATE TRIGGER trg_visit_stage BEFORE UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.validate_visit_stage();

-- 4. Keep appointment status in sync with the visit stage
CREATE OR REPLACE FUNCTION public.sync_appointment_from_visit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.appointment_id IS NULL OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  UPDATE public.appointments a
     SET status = CASE
       WHEN NEW.status = 'completed' THEN 'completed'::appointment_status
       WHEN NEW.status = 'cancelled' THEN 'cancelled'::appointment_status
       ELSE 'in_progress'::appointment_status
     END
   WHERE a.id = NEW.appointment_id
     AND a.status IS DISTINCT FROM (CASE
       WHEN NEW.status = 'completed' THEN 'completed'::appointment_status
       WHEN NEW.status = 'cancelled' THEN 'cancelled'::appointment_status
       ELSE 'in_progress'::appointment_status
     END);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_visit_sync_appointment ON public.visits;
CREATE TRIGGER trg_visit_sync_appointment AFTER UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.sync_appointment_from_visit();

-- 5. Atomic check-in RPC: appointment -> arrived + visit + token
CREATE OR REPLACE FUNCTION public.checkin_appointment(_appointment_id uuid)
RETURNS public.visits
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE a public.appointments; v public.visits;
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = _appointment_id FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Appointment not found'; END IF;
  IF a.status IN ('cancelled','no_show') THEN RAISE EXCEPTION 'Appointment is %', a.status; END IF;

  SELECT * INTO v FROM public.visits WHERE appointment_id = a.id AND status <> 'cancelled' LIMIT 1;
  IF v.id IS NOT NULL THEN
    RETURN v; -- already checked in: idempotent
  END IF;

  UPDATE public.appointments SET status = 'checked_in' WHERE id = a.id;

  SELECT * INTO v FROM public.visits WHERE appointment_id = a.id AND status <> 'cancelled' LIMIT 1;
  IF v.id IS NULL THEN
    INSERT INTO public.visits (branch_id, patient_id, appointment_id, doctor_id, status, chief_complaint, department)
    VALUES (a.branch_id, a.patient_id, a.id, a.doctor_id, 'waiting', a.reason, a.appointment_type)
    RETURNING * INTO v;
  END IF;
  RETURN v;
END; $$;

REVOKE ALL ON FUNCTION public.checkin_appointment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkin_appointment(uuid) TO authenticated;

-- 6. Walk-in visit RPC
CREATE OR REPLACE FUNCTION public.create_walk_in_visit(
  _patient_id uuid,
  _doctor_id uuid DEFAULT NULL,
  _branch_id uuid DEFAULT NULL,
  _chief_complaint text DEFAULT NULL,
  _priority text DEFAULT 'normal'
)
RETURNS public.visits
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE v public.visits; b uuid;
BEGIN
  SELECT * INTO v FROM public.visits
   WHERE patient_id = _patient_id AND status NOT IN ('completed','cancelled')
   ORDER BY checked_in_at DESC LIMIT 1;
  IF v.id IS NOT NULL THEN
    RETURN v; -- already in the queue today
  END IF;

  b := COALESCE(_branch_id, (SELECT branch_id FROM public.patients WHERE id = _patient_id));

  INSERT INTO public.visits (branch_id, patient_id, doctor_id, status, chief_complaint, priority, department)
  VALUES (b, _patient_id, _doctor_id, 'waiting', _chief_complaint, COALESCE(_priority,'normal'), 'walk_in')
  RETURNING * INTO v;
  RETURN v;
END; $$;

REVOKE ALL ON FUNCTION public.create_walk_in_visit(uuid, uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_walk_in_visit(uuid, uuid, uuid, text, text) TO authenticated;

-- 7. Realtime for the live queue
ALTER TABLE public.visits REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.visits;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;