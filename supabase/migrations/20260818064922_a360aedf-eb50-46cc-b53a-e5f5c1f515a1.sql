CREATE OR REPLACE FUNCTION public.recalc_invoice(_invoice_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _sub numeric := 0; _tax numeric := 0; _disc numeric := 0; _paid numeric := 0; _total numeric := 0; _items integer := 0;
BEGIN
  SELECT COUNT(*),
         COALESCE(SUM(quantity * unit_price),0),
         COALESCE(SUM(quantity * unit_price * tax_percent / 100),0)
    INTO _items, _sub, _tax
  FROM public.invoice_items WHERE invoice_id = _invoice_id;

  SELECT COALESCE(discount,0) INTO _disc FROM public.invoices WHERE id = _invoice_id;
  SELECT COALESCE(SUM(amount),0) INTO _paid FROM public.payments WHERE invoice_id = _invoice_id;

  IF _items = 0 THEN
    SELECT subtotal, tax INTO _sub, _tax FROM public.invoices WHERE id = _invoice_id;
  END IF;
  _total := GREATEST(COALESCE(_sub,0) + COALESCE(_tax,0) - COALESCE(_disc,0), 0);

  UPDATE public.invoices SET
    subtotal = COALESCE(_sub,0), tax = COALESCE(_tax,0), total = _total, paid_amount = _paid,
    status = CASE
      WHEN _paid <= 0 THEN 'unpaid'::payment_status
      WHEN _paid + 0.009 >= _total THEN 'paid'::payment_status
      ELSE 'partial'::payment_status END
  WHERE id = _invoice_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.invoice_item_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _exp date; _bqty integer; _sqty integer;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NULL; END IF;

  IF NEW.quantity < 0 THEN
    -- Return line: put the goods back into the same batch and stock pool.
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