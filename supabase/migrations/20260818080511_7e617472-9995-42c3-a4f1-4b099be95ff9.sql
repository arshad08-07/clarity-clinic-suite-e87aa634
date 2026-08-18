CREATE OR REPLACE FUNCTION public.surgery_complete_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE missing text[] := ARRAY[]::text[]; k text;
        required text[] := ARRAY['consent','fitness','fasting','site_marked','biometry'];
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'A completed surgery cannot be reopened';
  END IF;

  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    IF NOT NEW.preop_override THEN
      IF NEW.consent_status <> 'signed' THEN missing := missing || 'signed consent'::text; END IF;
      FOREACH k IN ARRAY required LOOP
        IF COALESCE((NEW.preop_checklist ->> k)::boolean, false) IS NOT TRUE THEN
          missing := missing || replace(k, '_', ' ')::text;
        END IF;
      END LOOP;
      IF NEW.procedure ILIKE '%cataract%' THEN
        IF NEW.biometry_axial_length IS NULL THEN missing := missing || 'biometry axial length'::text; END IF;
        IF NEW.iol_inventory_id IS NULL THEN missing := missing || 'IOL selection'::text; END IF;
      END IF;
      IF array_length(missing, 1) > 0 THEN
        RAISE EXCEPTION 'Surgery cannot be completed — missing pre-op requirements: %', array_to_string(missing, ', ');
      END IF;
    ELSIF COALESCE(btrim(NEW.preop_override_reason), '') = '' THEN
      RAISE EXCEPTION 'An override reason is required to complete without full pre-op data';
    END IF;
    IF NEW.ended_at IS NULL THEN NEW.ended_at := now(); END IF;
    IF NEW.started_at IS NULL THEN NEW.started_at := COALESCE(NEW.scheduled_at, now()); END IF;
  END IF;
  RETURN NEW;
END; $$;