-- ============ FOLLOW-UP LIFECYCLE ============
ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id),
  ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'upcoming',
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_visit_id uuid REFERENCES public.visits(id),
  ADD COLUMN IF NOT EXISTS outcome_notes text,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS allow_duplicate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_offset_days integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_by uuid;

UPDATE public.follow_ups SET status = CASE WHEN is_done THEN 'completed' ELSE 'upcoming' END;
UPDATE public.follow_ups f SET branch_id = p.branch_id FROM public.patients p WHERE f.branch_id IS NULL AND p.id = f.patient_id;
UPDATE public.follow_ups f SET doctor_id = COALESCE(v.doctor_id, s.surgeon_id, f.assigned_to)
  FROM public.patients p
  LEFT JOIN LATERAL (SELECT 1) z ON true
  LEFT JOIN public.visits v ON false
  LEFT JOIN public.surgeries s ON false
  WHERE p.id = f.patient_id AND f.doctor_id IS NULL AND false;
UPDATE public.follow_ups f SET doctor_id = v.doctor_id FROM public.visits v WHERE f.doctor_id IS NULL AND v.id = f.visit_id;
UPDATE public.follow_ups f SET doctor_id = s.surgeon_id FROM public.surgeries s WHERE f.doctor_id IS NULL AND s.id = f.surgery_id;
UPDATE public.follow_ups SET doctor_id = assigned_to WHERE doctor_id IS NULL;

ALTER TABLE public.follow_ups DROP CONSTRAINT IF EXISTS follow_ups_status_chk;
ALTER TABLE public.follow_ups ADD CONSTRAINT follow_ups_status_chk
  CHECK (status IN ('upcoming','completed','cancelled','no_show'));
ALTER TABLE public.follow_ups DROP CONSTRAINT IF EXISTS follow_ups_priority_chk;
ALTER TABLE public.follow_ups ADD CONSTRAINT follow_ups_priority_chk
  CHECK (priority IN ('low','normal','high','urgent'));

CREATE INDEX IF NOT EXISTS idx_follow_ups_due ON public.follow_ups (due_date, status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_patient ON public.follow_ups (patient_id);

-- Derived board state: upcoming / due / overdue / completed / cancelled / no_show
CREATE OR REPLACE FUNCTION public.follow_up_state(_due date, _status text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _status <> 'upcoming' THEN _status
    WHEN _due < CURRENT_DATE THEN 'overdue'
    WHEN _due = CURRENT_DATE THEN 'due'
    ELSE 'upcoming'
  END
$$;

-- ============ COMMUNICATION / REMINDER RECORDS ============
ALTER TABLE public.communications
  ADD COLUMN IF NOT EXISTS follow_up_id uuid REFERENCES public.follow_ups(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id),
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS recipient text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_comm_followup ON public.communications (follow_up_id);
CREATE INDEX IF NOT EXISTS idx_comm_queue ON public.communications (status, scheduled_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_followup_channel
  ON public.communications (follow_up_id, channel, purpose)
  WHERE follow_up_id IS NOT NULL;

-- ============ GUARDS & AUTOMATION ============
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
    IF NOT NEW.allow_duplicate AND EXISTS (
      SELECT 1 FROM public.follow_ups f
      WHERE f.patient_id = NEW.patient_id
        AND f.status = 'upcoming'
        AND f.due_date = NEW.due_date
        AND f.visit_id IS NOT DISTINCT FROM NEW.visit_id
        AND f.surgery_id IS NOT DISTINCT FROM NEW.surgery_id
    ) THEN
      RAISE EXCEPTION 'An active follow-up already exists for this patient on %', to_char(NEW.due_date, 'DD Mon YYYY');
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    RAISE EXCEPTION 'A completed follow-up cannot be reopened';
  END IF;

  -- keep legacy is_done flag and status in step
  IF TG_OP = 'UPDATE' AND NEW.is_done IS DISTINCT FROM OLD.is_done AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    NEW.status := CASE WHEN NEW.is_done THEN 'completed' ELSE 'upcoming' END;
  END IF;
  NEW.is_done := (NEW.status = 'completed');

  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN NEW.completed_at := now(); END IF;
  IF NEW.status <> 'completed' THEN NEW.completed_at := NULL; END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_follow_up_guard ON public.follow_ups;
CREATE TRIGGER trg_follow_up_guard BEFORE INSERT OR UPDATE ON public.follow_ups
FOR EACH ROW EXECUTE FUNCTION public.follow_up_guard();

-- Queue reminder communications when a follow-up is booked / rescheduled
CREATE OR REPLACE FUNCTION public.follow_up_queue_reminders()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.patients; _when timestamptz; _msg text; _channels text[]; _c text;
BEGIN
  IF NEW.status <> 'upcoming' THEN
    UPDATE public.communications
       SET status = 'cancelled', failure_reason = COALESCE(failure_reason, 'Follow-up ' || NEW.status)
     WHERE follow_up_id = NEW.id AND status = 'queued';
    RETURN NULL;
  END IF;

  SELECT * INTO _p FROM public.patients WHERE id = NEW.patient_id;
  _when := (NEW.due_date - make_interval(days => GREATEST(NEW.reminder_offset_days, 0)))::timestamptz + interval '9 hours';
  _msg := 'Reminder: ' || COALESCE(NEW.reason, initcap(replace(COALESCE(NEW.type,'review'), '_', ' ')))
          || ' follow-up on ' || to_char(NEW.due_date, 'DD Mon YYYY') || '.';

  _channels := ARRAY['internal'];
  IF COALESCE(_p.phone, '') <> '' THEN _channels := _channels || ARRAY['sms','whatsapp']; END IF;
  IF COALESCE(_p.email, '') <> '' THEN _channels := _channels || ARRAY['email']; END IF;

  FOREACH _c IN ARRAY _channels LOOP
    INSERT INTO public.communications
      (patient_id, follow_up_id, branch_id, channel, direction, purpose, subject, message,
       recipient, status, scheduled_at, created_by)
    VALUES
      (NEW.patient_id, NEW.id, NEW.branch_id, _c, 'outbound', 'follow_up_reminder',
       'Follow-up reminder', _msg,
       CASE WHEN _c = 'email' THEN _p.email WHEN _c IN ('sms','whatsapp') THEN _p.phone ELSE NULL END,
       'queued', _when, COALESCE(NEW.created_by, auth.uid()))
    ON CONFLICT (follow_up_id, channel, purpose) WHERE follow_up_id IS NOT NULL
    DO UPDATE SET scheduled_at = EXCLUDED.scheduled_at,
                  message = EXCLUDED.message,
                  status = CASE WHEN public.communications.status = 'sent' THEN 'sent' ELSE 'queued' END,
                  failure_reason = NULL;
  END LOOP;

  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_follow_up_reminders ON public.follow_ups;
CREATE TRIGGER trg_follow_up_reminders AFTER INSERT OR UPDATE OF due_date, status, reason, reminder_offset_days
ON public.follow_ups FOR EACH ROW EXECUTE FUNCTION public.follow_up_queue_reminders();

-- Dispatcher: internal notifications always delivered; external channels stay
-- provider-neutral and are only marked sent by a configured provider worker.
CREATE OR REPLACE FUNCTION public.dispatch_due_reminders()
RETURNS TABLE(delivered integer, held integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row record; _d integer := 0; _h integer := 0; _provider boolean;
BEGIN
  SELECT COALESCE((value->>'enabled')::boolean, false) INTO _provider
    FROM public.settings WHERE key = 'messaging_provider' LIMIT 1;
  _provider := COALESCE(_provider, false);

  FOR _row IN
    SELECT c.*, f.doctor_id, f.assigned_to, f.due_date, p.first_name, p.last_name
      FROM public.communications c
      JOIN public.follow_ups f ON f.id = c.follow_up_id
      JOIN public.patients p ON p.id = c.patient_id
     WHERE c.status = 'queued' AND c.scheduled_at <= now() AND f.status = 'upcoming'
  LOOP
    IF _row.channel = 'internal' THEN
      INSERT INTO public.notifications (user_id, title, body, link)
      SELECT u, 'Follow-up due ' || to_char(_row.due_date, 'DD Mon'),
             trim(_row.first_name || ' ' || COALESCE(_row.last_name,'')) || ' — ' || _row.message,
             '/follow-ups'
        FROM unnest(ARRAY[_row.doctor_id, _row.assigned_to, _row.created_by]) AS u
       WHERE u IS NOT NULL
       GROUP BY u;
      UPDATE public.communications
         SET status = 'sent', sent_at = now(), attempts = attempts + 1, provider = 'internal'
       WHERE id = _row.id;
      _d := _d + 1;
    ELSIF _provider THEN
      UPDATE public.communications SET attempts = attempts + 1 WHERE id = _row.id;
      _h := _h + 1;
    ELSE
      UPDATE public.communications
         SET status = 'skipped', attempts = attempts + 1,
             failure_reason = 'No external messaging provider configured for ' || _row.channel
       WHERE id = _row.id;
      _h := _h + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT _d, _h;
END; $$;

REVOKE ALL ON FUNCTION public.dispatch_due_reminders() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_due_reminders() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.follow_up_state(date, text) TO authenticated, anon, service_role;

-- Tighten communication reads to the caller's branch scope
DROP POLICY IF EXISTS staff_read_communications ON public.communications;
CREATE POLICY staff_read_communications ON public.communications FOR SELECT
USING (is_staff(auth.uid()) AND (patient_id IS NULL OR can_access_patient(patient_id)));