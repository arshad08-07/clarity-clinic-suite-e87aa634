-- 1. Surgery lifecycle columns
ALTER TABLE public.surgeries
  ADD COLUMN IF NOT EXISTS visit_id uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recommended_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS recommended_at timestamptz,
  ADD COLUMN IF NOT EXISTS recommendation_notes text,
  ADD COLUMN IF NOT EXISTS estimate_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS estimate_notes text,
  ADD COLUMN IF NOT EXISTS consent_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS consent_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_document_id uuid REFERENCES public.patient_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preop_checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS preop_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preop_override_reason text,
  ADD COLUMN IF NOT EXISTS biometry_order_id uuid REFERENCES public.diagnostic_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discharge_summary text,
  ADD COLUMN IF NOT EXISTS discharge_instructions text,
  ADD COLUMN IF NOT EXISTS discharged_at timestamptz;

ALTER TABLE public.surgeries DROP CONSTRAINT IF EXISTS surgeries_consent_status_check;
ALTER TABLE public.surgeries ADD CONSTRAINT surgeries_consent_status_check
  CHECK (consent_status IN ('pending','signed','declined'));

CREATE INDEX IF NOT EXISTS surgeries_visit_id_idx ON public.surgeries(visit_id);

-- IOL models can map to a stock product so implants move inventory
ALTER TABLE public.iol_models
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

-- 2. Completion guard: pre-op requirements + immutability of a completed surgery
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
      IF NEW.consent_status <> 'signed' THEN missing := missing || 'signed consent'; END IF;
      FOREACH k IN ARRAY required LOOP
        IF COALESCE((NEW.preop_checklist ->> k)::boolean, false) IS NOT TRUE THEN
          missing := missing || replace(k, '_', ' ');
        END IF;
      END LOOP;
      IF NEW.procedure ILIKE '%cataract%' THEN
        IF NEW.biometry_axial_length IS NULL THEN missing := missing || 'biometry axial length'; END IF;
        IF NEW.iol_inventory_id IS NULL THEN missing := missing || 'IOL selection'; END IF;
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

DROP TRIGGER IF EXISTS trg_surgery_guard ON public.surgeries;
CREATE TRIGGER trg_surgery_guard BEFORE INSERT OR UPDATE ON public.surgeries
FOR EACH ROW EXECUTE FUNCTION public.surgery_complete_guard();

-- 3. Implant consumption creates exactly one inventory movement
CREATE OR REPLACE FUNCTION public.surgery_iol_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _product uuid; _serial text;
BEGIN
  IF NEW.status <> 'completed' OR NEW.iol_inventory_id IS NULL THEN RETURN NULL; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND OLD.iol_inventory_id IS NOT DISTINCT FROM NEW.iol_inventory_id THEN
    RETURN NULL;
  END IF;

  SELECT m.product_id, i.serial_no INTO _product, _serial
    FROM public.iol_inventory i JOIN public.iol_models m ON m.id = i.iol_model_id
   WHERE i.id = NEW.iol_inventory_id;

  IF _product IS NULL THEN RETURN NULL; END IF;

  IF EXISTS (
    SELECT 1 FROM public.stock_movements
     WHERE reason = 'surgery' AND reference_id = NEW.id AND product_id = _product
  ) THEN
    RETURN NULL; -- already deducted for this surgery
  END IF;

  INSERT INTO public.stock_movements (product_id, branch_id, change_qty, reason, reference_id, batch_no, created_by)
  VALUES (_product, NEW.branch_id, -1, 'surgery', NEW.id, _serial, auth.uid());
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_surgery_iol_stock ON public.surgeries;
CREATE TRIGGER trg_surgery_iol_stock AFTER INSERT OR UPDATE ON public.surgeries
FOR EACH ROW EXECUTE FUNCTION public.surgery_iol_stock();

-- 4. Available implants only (not used, not expired)
CREATE OR REPLACE FUNCTION public.available_iol_inventory(_branch uuid DEFAULT NULL)
RETURNS TABLE (id uuid, serial_no text, power numeric, expiry_date date, branch_id uuid,
               model_name text, manufacturer text, price numeric)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT i.id, i.serial_no, i.power, i.expiry_date, i.branch_id, m.name, m.manufacturer, m.price
  FROM public.iol_inventory i
  JOIN public.iol_models m ON m.id = i.iol_model_id
  WHERE i.is_used = false
    AND (i.expiry_date IS NULL OR i.expiry_date >= CURRENT_DATE)
    AND (_branch IS NULL OR i.branch_id IS NULL OR i.branch_id = _branch)
  ORDER BY i.expiry_date NULLS LAST, i.serial_no
$$;
GRANT EXECUTE ON FUNCTION public.available_iol_inventory(uuid) TO authenticated;