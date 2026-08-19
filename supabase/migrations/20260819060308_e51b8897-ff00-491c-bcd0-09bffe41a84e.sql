
ALTER TABLE public.surgeries
  ADD COLUMN IF NOT EXISTS non_billable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS non_billable_reason text,
  ADD COLUMN IF NOT EXISTS non_billable_by uuid,
  ADD COLUMN IF NOT EXISTS non_billable_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_legacy_unbilled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legacy_unbilled_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS surgeries_invoice_unique
  ON public.surgeries (invoice_id) WHERE invoice_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.surgery_billing_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE inv public.invoices%ROWTYPE; line_count int;
BEGIN
  -- non-billable path: admin authorised, reason required
  IF NEW.non_billable AND (TG_OP = 'INSERT' OR COALESCE(OLD.non_billable, false) = false) THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only a clinic administrator can mark a surgery non-billable';
    END IF;
    IF COALESCE(btrim(NEW.non_billable_reason), '') = '' THEN
      RAISE EXCEPTION 'A reason is required to mark a surgery non-billable';
    END IF;
    IF NEW.invoice_id IS NOT NULL THEN
      RAISE EXCEPTION 'This surgery is already billed and cannot be marked non-billable';
    END IF;
    NEW.non_billable_by := auth.uid();
    NEW.non_billable_at := now();
  END IF;

  -- validate the linked invoice whenever it is set or changed
  IF NEW.invoice_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id) THEN
    SELECT * INTO inv FROM public.invoices WHERE id = NEW.invoice_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invoice not found';
    END IF;
    IF inv.patient_id IS DISTINCT FROM NEW.patient_id THEN
      RAISE EXCEPTION 'Invoice belongs to a different patient';
    END IF;
    IF COALESCE(inv.is_legacy, false) THEN
      RAISE EXCEPTION 'A legacy invoice cannot be linked to a surgery';
    END IF;
    SELECT count(*) INTO line_count FROM public.invoice_items
      WHERE invoice_id = inv.id AND source_type = 'surgery' AND source_id = NEW.id;
    IF line_count = 0 THEN
      RAISE EXCEPTION 'Invoice has no line item raised from this surgery';
    END IF;
    IF COALESCE(inv.total, 0) <= 0 THEN
      RAISE EXCEPTION 'Invoice total is not valid';
    END IF;
    IF EXISTS (SELECT 1 FROM public.surgeries s WHERE s.invoice_id = NEW.invoice_id AND s.id <> NEW.id) THEN
      RAISE EXCEPTION 'This invoice is already linked to another surgery';
    END IF;
    IF NEW.non_billable THEN
      RAISE EXCEPTION 'A non-billable surgery cannot be linked to an invoice';
    END IF;
  END IF;

  -- completion requires a billing outcome
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    IF NEW.invoice_id IS NULL AND NOT NEW.non_billable THEN
      RAISE EXCEPTION 'Surgery cannot be completed without a linked invoice. Raise the surgery invoice first, or record an authorised non-billable reason.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_surgery_billing ON public.surgeries;
CREATE TRIGGER trg_surgery_billing
  BEFORE INSERT OR UPDATE ON public.surgeries
  FOR EACH ROW EXECUTE FUNCTION public.surgery_billing_guard();
