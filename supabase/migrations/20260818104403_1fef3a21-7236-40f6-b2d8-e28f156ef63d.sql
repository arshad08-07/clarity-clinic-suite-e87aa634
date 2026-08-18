
CREATE UNIQUE INDEX IF NOT EXISTS settings_global_key_uidx ON public.settings (key) WHERE branch_id IS NULL;

CREATE OR REPLACE FUNCTION public.app_setting(_key text, _branch uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT value FROM public.settings WHERE key = _key AND branch_id = _branch LIMIT 1),
    (SELECT value FROM public.settings WHERE key = _key AND branch_id IS NULL LIMIT 1)
  )
$$;

CREATE OR REPLACE FUNCTION public.next_invoice_no(_branch uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE cfg jsonb; _prefix text; _pad integer; _n bigint;
BEGIN
  cfg := COALESCE(public.app_setting('billing', _branch), '{}'::jsonb);
  _prefix := COALESCE(NULLIF(btrim(cfg->>'invoice_prefix'), ''), 'INV-');
  _pad := GREATEST(LEAST(COALESCE((cfg->>'number_padding')::int, 6), 12), 1);
  _n := nextval('public.invoice_seq');
  RETURN _prefix || lpad(_n::text, _pad, '0');
END $$;

CREATE OR REPLACE FUNCTION public.follow_up_queue_reminders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _p public.patients; _when timestamptz; _msg text; _channels text[]; _c text;
        cfg jsonb; _offset integer; _hour integer;
BEGIN
  IF NEW.status <> 'upcoming' THEN
    UPDATE public.communications
       SET status = 'cancelled', failure_reason = COALESCE(failure_reason, 'Follow-up ' || NEW.status)
     WHERE follow_up_id = NEW.id AND status = 'queued';
    RETURN NULL;
  END IF;

  cfg := COALESCE(public.app_setting('notifications', NEW.branch_id), '{}'::jsonb);

  IF COALESCE((cfg->>'reminders_enabled')::boolean, true) IS NOT TRUE
     OR COALESCE((cfg->>'follow_up_reminders')::boolean, true) IS NOT TRUE THEN
    UPDATE public.communications
       SET status = 'cancelled', failure_reason = 'Reminders disabled in settings'
     WHERE follow_up_id = NEW.id AND status = 'queued';
    RETURN NULL;
  END IF;

  SELECT * INTO _p FROM public.patients WHERE id = NEW.patient_id;

  _offset := GREATEST(COALESCE(NULLIF(NEW.reminder_offset_days, 0), (cfg->>'reminder_offset_days')::int, 0), 0);
  _hour := GREATEST(LEAST(COALESCE((cfg->>'send_hour')::int, 9), 23), 0);
  _when := (NEW.due_date - make_interval(days => _offset))::timestamptz + make_interval(hours => _hour);
  _msg := 'Reminder: ' || COALESCE(NEW.reason, initcap(replace(COALESCE(NEW.type,'review'), '_', ' ')))
          || ' follow-up on ' || to_char(NEW.due_date, 'DD Mon YYYY') || '.';

  _channels := ARRAY['internal'];
  IF COALESCE(_p.phone, '') <> '' AND COALESCE((cfg->>'sms_enabled')::boolean, true) THEN _channels := _channels || ARRAY['sms']; END IF;
  IF COALESCE(_p.phone, '') <> '' AND COALESCE((cfg->>'whatsapp_enabled')::boolean, true) THEN _channels := _channels || ARRAY['whatsapp']; END IF;
  IF COALESCE(_p.email, '') <> '' AND COALESCE((cfg->>'email_enabled')::boolean, true) THEN _channels := _channels || ARRAY['email']; END IF;

  UPDATE public.communications
     SET status = 'cancelled', failure_reason = 'Channel disabled in settings'
   WHERE follow_up_id = NEW.id AND status = 'queued' AND NOT (channel = ANY(_channels));

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
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_due_reminders()
RETURNS TABLE(delivered integer, held integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _row record; _d integer := 0; _h integer := 0; _provider boolean; cfg jsonb;
BEGIN
  FOR _row IN
    SELECT c.*, f.doctor_id, f.assigned_to, f.due_date, p.first_name, p.last_name
      FROM public.communications c
      JOIN public.follow_ups f ON f.id = c.follow_up_id
      JOIN public.patients p ON p.id = c.patient_id
     WHERE c.status = 'queued' AND c.scheduled_at <= now() AND f.status = 'upcoming'
  LOOP
    cfg := COALESCE(public.app_setting('notifications', _row.branch_id), '{}'::jsonb);

    IF COALESCE((cfg->>'reminders_enabled')::boolean, true) IS NOT TRUE THEN
      UPDATE public.communications
         SET status = 'skipped', attempts = attempts + 1,
             failure_reason = 'Reminders disabled in settings'
       WHERE id = _row.id;
      _h := _h + 1;
      CONTINUE;
    END IF;

    IF _row.channel = 'internal' THEN
      IF COALESCE((cfg->>'internal_enabled')::boolean, true) IS NOT TRUE THEN
        UPDATE public.communications
           SET status = 'skipped', attempts = attempts + 1,
               failure_reason = 'Internal notifications disabled in settings'
         WHERE id = _row.id;
        _h := _h + 1;
        CONTINUE;
      END IF;
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
    ELSE
      IF COALESCE((cfg->>(_row.channel || '_enabled'))::boolean, true) IS NOT TRUE THEN
        UPDATE public.communications
           SET status = 'skipped', attempts = attempts + 1,
               failure_reason = initcap(_row.channel) || ' reminders disabled in settings'
         WHERE id = _row.id;
        _h := _h + 1;
        CONTINUE;
      END IF;
      SELECT COALESCE((value->>'enabled')::boolean, false) INTO _provider
        FROM public.settings WHERE key = 'messaging_provider' LIMIT 1;
      IF COALESCE(_provider, false) THEN
        UPDATE public.communications SET attempts = attempts + 1 WHERE id = _row.id;
      ELSE
        UPDATE public.communications
           SET status = 'skipped', attempts = attempts + 1,
               failure_reason = 'No external messaging provider configured for ' || _row.channel
         WHERE id = _row.id;
      END IF;
      _h := _h + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT _d, _h;
END $$;

CREATE OR REPLACE FUNCTION public.appointment_rules_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE cfg jsonb; _dow text; _day jsonb; _hol jsonb; _max integer; _lead integer;
        _start time; _end time; _t time; _slot integer;
BEGIN
  IF NEW.status IN ('cancelled','no_show') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at THEN RETURN NEW; END IF;

  cfg := COALESCE(public.app_setting('appointments', NEW.branch_id), '{}'::jsonb);
  IF cfg = '{}'::jsonb OR COALESCE((cfg->>'enforce_rules')::boolean, true) IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  _slot := GREATEST(COALESCE((cfg->>'slot_minutes')::int, 15), 5);
  IF NEW.duration_min IS NULL OR NEW.duration_min <= 0 THEN NEW.duration_min := _slot; END IF;

  _lead := COALESCE((cfg->>'min_lead_minutes')::int, 0);
  IF NEW.scheduled_at < now() + make_interval(mins => _lead) THEN
    RAISE EXCEPTION 'Appointments must be booked at least % minutes ahead', _lead;
  END IF;

  _max := COALESCE((cfg->>'max_advance_days')::int, 0);
  IF _max > 0 AND NEW.scheduled_at::date > (CURRENT_DATE + _max) THEN
    RAISE EXCEPTION 'Appointments cannot be booked more than % days ahead', _max;
  END IF;

  _hol := COALESCE(cfg->'holidays', '[]'::jsonb);
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(_hol) h WHERE h = to_char(NEW.scheduled_at, 'YYYY-MM-DD')) THEN
    RAISE EXCEPTION 'The clinic is closed on % (holiday)', to_char(NEW.scheduled_at, 'DD Mon YYYY');
  END IF;

  _dow := lower(to_char(NEW.scheduled_at, 'dy'));
  _day := cfg->'working_hours'->_dow;
  IF _day IS NULL OR COALESCE((_day->>'open')::boolean, true) IS NOT TRUE THEN
    RAISE EXCEPTION 'The clinic is closed on %', btrim(to_char(NEW.scheduled_at, 'Day'));
  END IF;

  _start := COALESCE(NULLIF(_day->>'start','')::time, '09:00'::time);
  _end := COALESCE(NULLIF(_day->>'end','')::time, '18:00'::time);
  _t := NEW.scheduled_at::time;
  IF _t < _start OR (_t + make_interval(mins => NEW.duration_min))::time > _end THEN
    RAISE EXCEPTION 'That time is outside working hours (%-%)', _start, _end;
  END IF;

  IF NULLIF(_day->>'break_start','') IS NOT NULL AND NULLIF(_day->>'break_end','') IS NOT NULL THEN
    IF (_t, (_t + make_interval(mins => NEW.duration_min))::time)
       OVERLAPS ((_day->>'break_start')::time, (_day->>'break_end')::time) THEN
      RAISE EXCEPTION 'That time falls in the clinic break (%-%)', _day->>'break_start', _day->>'break_end';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_appointment_rules ON public.appointments;
CREATE TRIGGER trg_appointment_rules
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.appointment_rules_guard();
