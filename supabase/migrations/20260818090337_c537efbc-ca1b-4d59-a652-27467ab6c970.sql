
ALTER TABLE public.optical_orders
  ADD COLUMN IF NOT EXISTS lens_od_product_id uuid REFERENCES public.products(id),
  ADD COLUMN IF NOT EXISTS lens_os_product_id uuid REFERENCES public.products(id),
  ADD COLUMN IF NOT EXISTS frame_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lens_od_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lens_os_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_applied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

-- normalise legacy status vocabulary
UPDATE public.optical_orders SET status = 'processing' WHERE status = 'in_production';

-- Stock is reserved/deducted when the order is placed, and restored on cancellation.
CREATE OR REPLACE FUNCTION public.optical_order_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _q integer; _p uuid; _prods uuid[];
BEGIN
  _prods := ARRAY(SELECT x FROM unnest(ARRAY[NEW.frame_product_id, NEW.lens_od_product_id, NEW.lens_os_product_id, NEW.lens_product_id]) AS x WHERE x IS NOT NULL);

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'cancelled' THEN RETURN NULL; END IF;
    FOREACH _p IN ARRAY _prods LOOP
      SELECT stock_qty INTO _q FROM public.products WHERE id = _p;
      IF _q IS NULL OR _q < NEW.quantity THEN
        RAISE EXCEPTION 'Not enough stock for %', (SELECT name FROM public.products WHERE id = _p);
      END IF;
      INSERT INTO public.stock_movements (product_id, branch_id, change_qty, reason, reference_id, created_by)
      VALUES (_p, NEW.branch_id, -NEW.quantity, 'optical_order', NEW.id, auth.uid());
    END LOOP;
    UPDATE public.optical_orders SET stock_applied = true WHERE id = NEW.id;
    RETURN NULL;
  END IF;

  -- cancellation: give the goods back exactly once
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' AND OLD.stock_applied THEN
    FOREACH _p IN ARRAY _prods LOOP
      INSERT INTO public.stock_movements (product_id, branch_id, change_qty, reason, reference_id, created_by)
      VALUES (_p, NEW.branch_id, NEW.quantity, 'optical_cancel', NEW.id, auth.uid());
    END LOOP;
    UPDATE public.optical_orders SET stock_applied = false WHERE id = NEW.id;
  END IF;
  RETURN NULL;
END; $function$;

DROP TRIGGER IF EXISTS trg_optical_order_stock ON public.optical_orders;
CREATE TRIGGER trg_optical_order_stock
AFTER INSERT OR UPDATE OF status ON public.optical_orders
FOR EACH ROW EXECUTE FUNCTION public.optical_order_stock();

-- Lifecycle guard: legal transitions only, no duplicate delivery, no edits after close.
CREATE OR REPLACE FUNCTION public.optical_order_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NULL OR NEW.status = '' THEN NEW.status := 'ordered'; END IF;
    IF NEW.status NOT IN ('ordered') THEN RAISE EXCEPTION 'A new optical order must start as Ordered'; END IF;
    IF COALESCE(NEW.quantity,0) < 1 THEN RAISE EXCEPTION 'Quantity must be at least 1'; END IF;
    IF NEW.frame_product_id IS NULL AND NEW.lens_od_product_id IS NULL AND NEW.lens_os_product_id IS NULL AND NEW.lens_product_id IS NULL THEN
      RAISE EXCEPTION 'Select at least a frame or a lens';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('delivered','cancelled') AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'This optical order is already % and cannot change', OLD.status;
  END IF;

  IF NEW.status <> OLD.status THEN
    IF NOT (
      (OLD.status = 'ordered'    AND NEW.status IN ('processing','cancelled')) OR
      (OLD.status = 'processing' AND NEW.status IN ('ready','cancelled')) OR
      (OLD.status = 'ready'      AND NEW.status IN ('delivered','cancelled'))
    ) THEN
      RAISE EXCEPTION 'Cannot move an optical order from % to %', OLD.status, NEW.status;
    END IF;

    IF NEW.status = 'delivered' THEN
      IF NEW.invoice_id IS NULL THEN RAISE EXCEPTION 'Raise the optical invoice before delivery'; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = NEW.invoice_id AND i.paid_amount + 0.009 >= i.total) THEN
        RAISE EXCEPTION 'Collect the outstanding balance before delivery';
      END IF;
      NEW.delivered_at := now();
    END IF;

    IF NEW.status = 'cancelled' THEN
      NEW.cancelled_at := now();
    END IF;
  END IF;

  IF OLD.status IN ('delivered','cancelled') AND (
       NEW.frame_product_id IS DISTINCT FROM OLD.frame_product_id OR
       NEW.lens_od_product_id IS DISTINCT FROM OLD.lens_od_product_id OR
       NEW.lens_os_product_id IS DISTINCT FROM OLD.lens_os_product_id OR
       NEW.quantity IS DISTINCT FROM OLD.quantity) THEN
    RAISE EXCEPTION 'A closed optical order cannot be edited';
  END IF;

  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_optical_order_guard ON public.optical_orders;
CREATE TRIGGER trg_optical_order_guard
BEFORE INSERT OR UPDATE ON public.optical_orders
FOR EACH ROW EXECUTE FUNCTION public.optical_order_guard();

-- Optical stock is handled at order level, so optical invoice lines must not deduct again.
CREATE OR REPLACE FUNCTION public.invoice_item_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _exp date; _bqty integer; _sqty integer;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NULL; END IF;
  IF NEW.source_type = 'optical' THEN RETURN NULL; END IF;

  IF NEW.quantity < 0 THEN
    IF NEW.batch_id IS NOT NULL THEN
      UPDATE public.product_batches SET quantity = quantity + (-NEW.quantity)::integer WHERE id = NEW.batch_id;
    END IF;
    INSERT INTO public.stock_movements (product_id, change_qty, reason, reference_id, batch_no, created_by)
    SELECT NEW.product_id, (-NEW.quantity)::integer, 'sale_return', NEW.invoice_id,
           (SELECT batch_no FROM public.product_batches WHERE id = NEW.batch_id), auth.uid();
    RETURN NULL;
  END IF;

  IF NEW.batch_id IS NOT NULL THEN
    SELECT expiry_date, quantity INTO _exp, _bqty FROM public.product_batches WHERE id = NEW.batch_id;
    IF _exp IS NOT NULL AND _exp < CURRENT_DATE THEN RAISE EXCEPTION 'This batch is expired and cannot be sold'; END IF;
    IF _bqty < NEW.quantity THEN RAISE EXCEPTION 'Not enough quantity in the selected batch'; END IF;
    UPDATE public.product_batches SET quantity = quantity - NEW.quantity::integer WHERE id = NEW.batch_id;
  END IF;
  SELECT stock_qty INTO _sqty FROM public.products WHERE id = NEW.product_id;
  IF _sqty < NEW.quantity THEN RAISE EXCEPTION 'Not enough stock for this item'; END IF;
  INSERT INTO public.stock_movements (product_id, change_qty, reason, reference_id, batch_no, created_by)
  SELECT NEW.product_id, -NEW.quantity::integer, 'sale', NEW.invoice_id,
         (SELECT batch_no FROM public.product_batches WHERE id = NEW.batch_id), auth.uid();
  RETURN NULL;
END; $function$;
