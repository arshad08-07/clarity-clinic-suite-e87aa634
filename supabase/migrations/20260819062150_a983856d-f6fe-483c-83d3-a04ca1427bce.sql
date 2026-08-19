
-- 1. Batch tracking flag
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS batch_tracked boolean NOT NULL DEFAULT false;

UPDATE public.products p SET batch_tracked = true
 WHERE EXISTS (SELECT 1 FROM public.product_batches b WHERE b.product_id = p.id);

CREATE OR REPLACE FUNCTION public.product_batch_qty(_product uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(quantity), 0)::int FROM public.product_batches WHERE product_id = _product;
$$;

-- 2. Batch quantities drive products.stock_qty for batch-tracked products
CREATE OR REPLACE FUNCTION public.sync_product_stock_from_batches()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p uuid;
BEGIN
  _p := COALESCE(NEW.product_id, OLD.product_id);
  PERFORM set_config('app.stock_sync', 'on', true);
  UPDATE public.products
     SET batch_tracked = true,
         stock_qty = public.product_batch_qty(_p)
   WHERE id = _p;
  PERFORM set_config('app.stock_sync', 'off', true);
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_batch_stock_sync ON public.product_batches;
CREATE TRIGGER trg_batch_stock_sync
AFTER INSERT OR UPDATE OR DELETE ON public.product_batches
FOR EACH ROW EXECUTE FUNCTION public.sync_product_stock_from_batches();

-- 3. Block manual stock_qty edits on batch-tracked products
CREATE OR REPLACE FUNCTION public.products_stock_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.batch_tracked
     AND NEW.stock_qty IS DISTINCT FROM OLD.stock_qty
     AND COALESCE(current_setting('app.stock_sync', true), 'off') <> 'on' THEN
    NEW.stock_qty := OLD.stock_qty;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_products_stock_guard ON public.products;
CREATE TRIGGER trg_products_stock_guard
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_stock_guard();

-- 4. Stock movements stay the ledger; they no longer double-apply for batch products
CREATE OR REPLACE FUNCTION public.stock_movement_apply()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _new_qty integer; _tracked boolean; _batch uuid; _bqty integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT batch_tracked INTO _tracked FROM public.products WHERE id = OLD.product_id;
    IF COALESCE(_tracked, false) THEN RETURN OLD; END IF;
    UPDATE public.products SET stock_qty = GREATEST(stock_qty - OLD.change_qty, 0) WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Stock movements are an immutable ledger and cannot be edited';
  END IF;

  SELECT batch_tracked INTO _tracked FROM public.products WHERE id = NEW.product_id;

  IF COALESCE(_tracked, false) THEN
    -- batch state already changed by the originating workflow: ledger entry only
    IF COALESCE(current_setting('app.batch_applied', true), 'off') = 'on' THEN
      RETURN NEW;
    END IF;
    -- manual adjustment: must name an existing batch, batch state stays authoritative
    IF NEW.batch_no IS NULL OR btrim(NEW.batch_no) = '' THEN
      RAISE EXCEPTION 'This product is batch tracked — record the adjustment against a batch';
    END IF;
    SELECT id, quantity INTO _batch, _bqty FROM public.product_batches
     WHERE product_id = NEW.product_id AND batch_no = NEW.batch_no
     ORDER BY expiry_date NULLS LAST LIMIT 1;
    IF _batch IS NULL THEN RAISE EXCEPTION 'Batch % does not exist for this product', NEW.batch_no; END IF;
    IF _bqty + NEW.change_qty < 0 THEN RAISE EXCEPTION 'Not enough stock in batch %', NEW.batch_no; END IF;
    UPDATE public.product_batches SET quantity = quantity + NEW.change_qty WHERE id = _batch;
    RETURN NEW;
  END IF;

  SELECT stock_qty + NEW.change_qty INTO _new_qty FROM public.products WHERE id = NEW.product_id FOR UPDATE;
  IF _new_qty < 0 THEN RAISE EXCEPTION 'Not enough stock for this movement'; END IF;
  UPDATE public.products SET stock_qty = _new_qty WHERE id = NEW.product_id;
  RETURN NEW;
END; $$;

-- 5. Goods receipt: batch products must be received into a batch
CREATE OR REPLACE FUNCTION public.grn_item_apply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE _grn public.goods_receipts; _poi public.purchase_order_items; _cat product_category;
        _batch uuid; _billed numeric; _tracked boolean;
BEGIN
  SELECT * INTO _grn FROM public.goods_receipts WHERE id = NEW.goods_receipt_id;

  IF NEW.received_qty <= 0 THEN RAISE EXCEPTION 'Received quantity must be greater than zero'; END IF;
  IF NEW.rejected_qty < 0 OR NEW.rejected_qty > NEW.received_qty THEN
    RAISE EXCEPTION 'Rejected quantity cannot exceed the received quantity';
  END IF;
  NEW.accepted_qty := NEW.received_qty - NEW.rejected_qty;

  IF NEW.purchase_order_item_id IS NOT NULL THEN
    SELECT * INTO _poi FROM public.purchase_order_items WHERE id = NEW.purchase_order_item_id FOR UPDATE;
    IF NOT _grn.allow_over_receipt AND (_poi.received_qty + NEW.accepted_qty) > _poi.quantity THEN
      RAISE EXCEPTION 'Cannot receive more than ordered (ordered %, already received %)', _poi.quantity, _poi.received_qty;
    END IF;
  END IF;

  SELECT category, batch_tracked INTO _cat, _tracked FROM public.products WHERE id = NEW.product_id;

  IF COALESCE(_tracked, false) AND (NEW.batch_no IS NULL OR btrim(NEW.batch_no) = '') THEN
    RAISE EXCEPTION 'This product is batch tracked — enter a batch number for the received goods';
  END IF;

  IF NEW.accepted_qty > 0 THEN
    IF NEW.batch_no IS NOT NULL AND btrim(NEW.batch_no) <> '' THEN
      SELECT id INTO _batch FROM public.product_batches
       WHERE product_id = NEW.product_id AND batch_no = NEW.batch_no
         AND branch_id IS NOT DISTINCT FROM _grn.branch_id
         AND expiry_date IS NOT DISTINCT FROM NEW.expiry_date
       LIMIT 1;
      IF _batch IS NULL THEN
        INSERT INTO public.product_batches (product_id, branch_id, batch_no, expiry_date, quantity, cost_price, selling_price)
        VALUES (NEW.product_id, _grn.branch_id, NEW.batch_no, NEW.expiry_date, NEW.accepted_qty, NEW.unit_cost,
                COALESCE(NEW.selling_price, (SELECT selling_price FROM public.products WHERE id = NEW.product_id), 0))
        RETURNING id INTO _batch;
      ELSE
        UPDATE public.product_batches
           SET quantity = quantity + NEW.accepted_qty,
               cost_price = NEW.unit_cost,
               selling_price = COALESCE(NEW.selling_price, selling_price)
         WHERE id = _batch;
      END IF;
      NEW.batch_id := _batch;
      PERFORM set_config('app.batch_applied', 'on', true);
    END IF;

    INSERT INTO public.stock_movements (product_id, branch_id, change_qty, reason, reference_id, batch_no, expiry_date, created_by)
    VALUES (NEW.product_id, _grn.branch_id, NEW.accepted_qty, 'purchase', _grn.id, NEW.batch_no, NEW.expiry_date, auth.uid());
    PERFORM set_config('app.batch_applied', 'off', true);

    UPDATE public.products
       SET cost_price = NEW.unit_cost,
           selling_price = COALESCE(NEW.selling_price, selling_price)
     WHERE id = NEW.product_id;
  END IF;

  IF NEW.purchase_order_item_id IS NOT NULL THEN
    UPDATE public.purchase_order_items
       SET received_qty = received_qty + NEW.accepted_qty
     WHERE id = NEW.purchase_order_item_id;
  END IF;

  _billed := COALESCE(NEW.accepted_qty * NEW.unit_cost * (1 + COALESCE(NEW.tax_percent,0)/100), 0);
  IF _grn.supplier_id IS NOT NULL THEN
    INSERT INTO public.supplier_transactions (supplier_id, purchase_order_id, goods_receipt_id, txn_type, amount, reference, txn_date, created_by)
    VALUES (_grn.supplier_id, _grn.purchase_order_id, _grn.id, 'bill', _billed, _grn.grn_no, _grn.received_at::date, auth.uid())
    ON CONFLICT (goods_receipt_id) WHERE txn_type = 'bill'
    DO UPDATE SET amount = public.supplier_transactions.amount + EXCLUDED.amount;
  END IF;

  RETURN NEW;
END; $function$;

-- 6. Sales / returns: batch products must move through a batch
CREATE OR REPLACE FUNCTION public.invoice_item_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE _exp date; _bqty integer; _sqty integer; _tracked boolean;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NULL; END IF;
  IF NEW.source_type = 'optical' THEN RETURN NULL; END IF;

  SELECT batch_tracked, stock_qty INTO _tracked, _sqty FROM public.products WHERE id = NEW.product_id;
  IF COALESCE(_tracked, false) AND NEW.batch_id IS NULL THEN
    RAISE EXCEPTION 'This product is batch tracked — select a batch';
  END IF;

  IF NEW.quantity < 0 THEN
    IF NEW.batch_id IS NOT NULL THEN
      UPDATE public.product_batches SET quantity = quantity + (-NEW.quantity)::integer WHERE id = NEW.batch_id;
      PERFORM set_config('app.batch_applied', 'on', true);
    END IF;
    INSERT INTO public.stock_movements (product_id, change_qty, reason, reference_id, batch_no, created_by)
    SELECT NEW.product_id, (-NEW.quantity)::integer, 'sale_return', NEW.invoice_id,
           (SELECT batch_no FROM public.product_batches WHERE id = NEW.batch_id), auth.uid();
    PERFORM set_config('app.batch_applied', 'off', true);
    RETURN NULL;
  END IF;

  IF NEW.batch_id IS NOT NULL THEN
    SELECT expiry_date, quantity INTO _exp, _bqty FROM public.product_batches WHERE id = NEW.batch_id;
    IF _exp IS NOT NULL AND _exp < CURRENT_DATE THEN RAISE EXCEPTION 'This batch is expired and cannot be sold'; END IF;
    IF _bqty < NEW.quantity THEN RAISE EXCEPTION 'Not enough quantity in the selected batch'; END IF;
    UPDATE public.product_batches SET quantity = quantity - NEW.quantity::integer WHERE id = NEW.batch_id;
    PERFORM set_config('app.batch_applied', 'on', true);
  END IF;
  IF NOT COALESCE(_tracked, false) AND _sqty < NEW.quantity THEN
    RAISE EXCEPTION 'Not enough stock for this item';
  END IF;
  INSERT INTO public.stock_movements (product_id, change_qty, reason, reference_id, batch_no, created_by)
  SELECT NEW.product_id, -NEW.quantity::integer, 'sale', NEW.invoice_id,
         (SELECT batch_no FROM public.product_batches WHERE id = NEW.batch_id), auth.uid();
  PERFORM set_config('app.batch_applied', 'off', true);
  RETURN NULL;
END; $function$;

-- 7. One authoritative low-stock source
CREATE OR REPLACE VIEW public.low_stock_products
WITH (security_invoker = true) AS
SELECT id, sku, name, category, brand, unit, stock_qty AS available_quantity, reorder_level, batch_tracked
  FROM public.products
 WHERE is_active AND stock_qty <= reorder_level;

GRANT SELECT ON public.low_stock_products TO authenticated;
GRANT ALL ON public.low_stock_products TO service_role;

-- 8. Explicit, audited reconciliation of legacy divergence
INSERT INTO public.audit_logs (user_id, action, entity, entity_id, details)
SELECT NULL, 'stock_reconciled', 'products', p.id,
       jsonb_build_object(
         'reason', 'Inventory reconciliation: batch quantities adopted as the authoritative stock for batch-tracked products',
         'sku', p.sku,
         'previous_stock_qty', p.stock_qty,
         'batch_total', public.product_batch_qty(p.id),
         'reconciled_at', now(),
         'reconciled_by', 'system migration (inventory reconciliation)')
  FROM public.products p
 WHERE p.batch_tracked AND p.stock_qty IS DISTINCT FROM public.product_batch_qty(p.id);

DO $$
BEGIN
  PERFORM set_config('app.stock_sync', 'on', true);
  UPDATE public.products p SET stock_qty = public.product_batch_qty(p.id)
   WHERE p.batch_tracked AND p.stock_qty IS DISTINCT FROM public.product_batch_qty(p.id);
  PERFORM set_config('app.stock_sync', 'off', true);
END $$;
