CREATE OR REPLACE FUNCTION public.appointment_rules_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE cfg jsonb; _dow text; _day jsonb; _hol jsonb; _max integer; _lead integer;
        _start time; _end time; _t time; _slot integer; _tz text; _local timestamp;
BEGIN
  IF NEW.status IN ('cancelled','no_show') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at THEN RETURN NEW; END IF;

  cfg := COALESCE(public.app_setting('appointments', NEW.branch_id), '{}'::jsonb);
  IF cfg = '{}'::jsonb OR COALESCE((cfg->>'enforce_rules')::boolean, true) IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  _tz := COALESCE(NULLIF(cfg->>'timezone',''), 'Asia/Kolkata');
  _local := NEW.scheduled_at AT TIME ZONE _tz;

  _slot := GREATEST(COALESCE((cfg->>'slot_minutes')::int, 15), 5);
  IF NEW.duration_min IS NULL OR NEW.duration_min <= 0 THEN NEW.duration_min := _slot; END IF;

  _lead := COALESCE((cfg->>'min_lead_minutes')::int, 0);
  IF NEW.scheduled_at < now() + make_interval(mins => _lead) THEN
    RAISE EXCEPTION 'Appointments must be booked at least % minutes ahead', _lead;
  END IF;

  _max := COALESCE((cfg->>'max_advance_days')::int, 0);
  IF _max > 0 AND _local::date > ((now() AT TIME ZONE _tz)::date + _max) THEN
    RAISE EXCEPTION 'Appointments cannot be booked more than % days ahead', _max;
  END IF;

  _hol := COALESCE(cfg->'holidays', '[]'::jsonb);
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(_hol) h WHERE h = to_char(_local, 'YYYY-MM-DD')) THEN
    RAISE EXCEPTION 'The clinic is closed on % (holiday)', to_char(_local, 'DD Mon YYYY');
  END IF;

  _dow := lower(to_char(_local, 'dy'));
  _day := cfg->'working_hours'->_dow;
  IF _day IS NULL OR COALESCE((_day->>'open')::boolean, true) IS NOT TRUE THEN
    RAISE EXCEPTION 'The clinic is closed on %', btrim(to_char(_local, 'Day'));
  END IF;

  _start := COALESCE(NULLIF(_day->>'start','')::time, '09:00'::time);
  _end := COALESCE(NULLIF(_day->>'end','')::time, '18:00'::time);
  _t := _local::time;
  IF _t < _start OR (_t + make_interval(mins => NEW.duration_min))::time > _end THEN
    RAISE EXCEPTION 'That time is outside working hours (%-%)', _start, _end;
  END IF;

  RETURN NEW;
END;
$$;