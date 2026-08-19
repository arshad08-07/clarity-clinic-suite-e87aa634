-- 1. Legacy marker for historically invalid invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS is_legacy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legacy_reason text;

-- Unique invoice numbers
CREATE UNIQUE INDEX IF NOT EXISTS invoices_invoice_no_key ON public.invoices (invoice_no);

-- Duplicate source billing protection
CREATE UNIQUE INDEX IF NOT EXISTS invoice_items_source_unique
  ON public.invoice_items (source_type, source_id)
  WHERE source_id IS NOT NULL
    AND source_type IN ('consultation','diagnostics','surgery','optical','pharmacy');

-- 2. Recalculation is the single source of truth for money columns
CREATE OR REPLACE FUNCTION public.recalc_invoice(_invoice_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _sub numeric := 0; _tax numeric := 0; _disc numeric := 0; _paid numeric := 0; _total numeric := 0; _items integer := 0; _legacy boolean;
BEGIN
  SELECT is_legacy INTO _legacy FROM public.invoices WHERE id = _invoice_id;
  IF _legacy IS NULL OR _legacy THEN RETURN; END IF;

  SELECT COUNT(*),
         COALESCE(SUM(quantity * unit_price),0),
         COALESCE(SUM(quantity * unit_price * tax_percent / 100),0)
    INTO _items, _sub, _tax
  FROM public.invoice_items WHERE invoice_id = _invoice_id;

  SELECT COALESCE(discount,0) INTO _disc FROM public.invoices WHERE id = _invoice_id;
  SELECT COALESCE(SUM(amount),0) INTO _paid FROM public.payments WHERE invoice_id = _invoice_id;

  _total := GREATEST(COALESCE(_sub,0) + COALESCE(_tax,0) - COALESCE(_disc,0), 0);

  PERFORM set_config('app.invoice_recalc', '1', true);
  UPDATE public.invoices SET
    subtotal = COALESCE(_sub,0), tax = COALESCE(_tax,0), total = _total, paid_amount = _paid,
    status = CASE
      WHEN _paid <= 0 THEN 'unpaid'::payment_status
      WHEN _paid + 0.009 >= _total THEN 'paid'::payment_status
      ELSE 'partial'::payment_status END
  WHERE id = _invoice_id;
  PERFORM set_config('app.invoice_recalc', '0', true);
END; $function$;

-- 3. Invoice header guard: server-generated number, derived money columns
CREATE OR REPLACE FUNCTION public.invoice_header_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.invoice_no := public.next_invoice_no(NEW.branch_id);
    NEW.subtotal := 0; NEW.tax := 0; NEW.total := 0; NEW.paid_amount := 0;
    NEW.status := 'unpaid'::payment_status;
    NEW.is_legacy := false; NEW.legacy_reason := NULL;
    NEW.discount := GREATEST(COALESCE(NEW.discount,0), 0);
    RETURN NEW;
  END IF;

  IF COALESCE(current_setting('app.invoice_recalc', true), '0') <> '1' THEN
    -- Client writes can never change the number or the derived money columns
    NEW.invoice_no := OLD.invoice_no;
    NEW.subtotal := OLD.subtotal;
    NEW.tax := OLD.tax;
    NEW.total := OLD.total;
    NEW.paid_amount := OLD.paid_amount;
    NEW.status := OLD.status;
    IF NOT public.is_admin(auth.uid()) THEN
      NEW.is_legacy := OLD.is_legacy;
      NEW.legacy_reason := OLD.legacy_reason;
    END IF;
    IF OLD.is_legacy THEN
      NEW.discount := OLD.discount;
    ELSE
      NEW.discount := GREATEST(COALESCE(NEW.discount,0), 0);
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_invoice_header_guard ON public.invoices;
CREATE TRIGGER trg_invoice_header_guard
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.invoice_header_guard();

-- Recalculate when discount changes (skips recalc-driven updates)
CREATE OR REPLACE FUNCTION public.invoice_discount_after()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(current_setting('app.invoice_recalc', true), '0') = '1' THEN RETURN NULL; END IF;
  IF NEW.discount IS DISTINCT FROM OLD.discount THEN
    PERFORM public.recalc_invoice(NEW.id);
  END IF;
  RETURN NULL;
END; $function$;

DROP TRIGGER IF EXISTS trg_invoice_discount_after ON public.invoices;
CREATE TRIGGER trg_invoice_discount_after
  AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.invoice_discount_after();

-- 4. Payments require at least one valid line item
CREATE OR REPLACE FUNCTION public.payment_validate()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE _total numeric; _paid numeric; _items integer; _legacy boolean;
BEGIN
  IF NEW.amount = 0 THEN RAISE EXCEPTION 'Payment amount cannot be zero'; END IF;
  SELECT total, is_legacy INTO _total, _legacy FROM public.invoices WHERE id = NEW.invoice_id;
  SELECT COUNT(*) INTO _items FROM public.invoice_items WHERE invoice_id = NEW.invoice_id;
  IF NOT COALESCE(_legacy,false) AND _items = 0 THEN
    RAISE EXCEPTION 'This invoice has no line items yet — add the charges before taking a payment';
  END IF;
  IF COALESCE(_legacy,false) THEN
    RAISE EXCEPTION 'This invoice is marked as legacy and cannot accept new entries';
  END IF;
  SELECT COALESCE(SUM(amount),0) INTO _paid FROM public.payments
    WHERE invoice_id = NEW.invoice_id AND id <> COALESCE(NEW.id, gen_random_uuid());
  IF NEW.amount > 0 AND _paid + NEW.amount > COALESCE(_total,0) + 0.009 THEN
    RAISE EXCEPTION 'Payment exceeds the invoice balance';
  END IF;
  IF NEW.amount < 0 AND _paid + NEW.amount < -0.009 THEN
    RAISE EXCEPTION 'Refund exceeds the amount already paid';
  END IF;
  RETURN NEW;
END; $function$;

-- 5. Line items cannot be added to legacy invoices
CREATE OR REPLACE FUNCTION public.invoice_item_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE _legacy boolean;
BEGIN
  SELECT is_legacy INTO _legacy FROM public.invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF COALESCE(_legacy,false) THEN
    RAISE EXCEPTION 'This invoice is marked as legacy and cannot be modified';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $function$;

DROP TRIGGER IF EXISTS trg_invoice_item_guard ON public.invoice_items;
CREATE TRIGGER trg_invoice_item_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.invoice_item_guard();