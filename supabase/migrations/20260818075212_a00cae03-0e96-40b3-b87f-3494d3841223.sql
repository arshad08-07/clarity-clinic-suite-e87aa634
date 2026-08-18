-- PO item pricing fields
ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS tax_percent numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount numeric(12,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.po_item_sync()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero'; END IF;
  NEW.amount := GREATEST(NEW.quantity * NEW.unit_cost * (1 + COALESCE(NEW.tax_percent,0)/100) - COALESCE(NEW.discount,0), 0);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.po_recalc(_po_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _total numeric := 0; _items integer := 0; _full integer := 0; _partial integer := 0; _st po_status;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(amount),0),
         COUNT(*) FILTER (WHERE received_qty >= quantity),
         COUNT(*) FILTER (WHERE received_qty > 0)
    INTO _items, _total, _full, _partial
  FROM public.purchase_order_items WHERE purchase_order_id = _po_id;

  SELECT status INTO _st FROM public.purchase_orders WHERE id = _po_id;
  IF _st NOT IN ('cancelled') THEN
    IF _items > 0 AND _full = _items THEN _st := 'received';
    ELSIF _partial > 0 THEN _st := 'partially_received';
    END IF;
  END IF;

  UPDATE public.purchase_orders SET total_amount = _total, status = _st WHERE id = _po_id;
END; $$;

CREATE OR REPLACE FUNCTION public.po_items_after()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM public.po_recalc(COALESCE(NEW.purchase_order_id, OLD.purchase_order_id));
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_po_item_sync ON public.purchase_order_items;
CREATE TRIGGER trg_po_item_sync BEFORE INSERT OR UPDATE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.po_item_sync();
DROP TRIGGER IF EXISTS trg_po_item_recalc ON public.purchase_order_items;
CREATE TRIGGER trg_po_item_recalc AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.po_items_after();

-- Goods receipts
CREATE TABLE IF NOT EXISTS public.goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  grn_no text NOT NULL DEFAULT ('GRN-' || to_char(now(),'YYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  received_at timestamptz NOT NULL DEFAULT now(),
  received_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  allow_over_receipt boolean NOT NULL DEFAULT false,
  invoice_ref text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goods_receipts TO authenticated;
GRANT ALL ON public.goods_receipts TO service_role;
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance_read_grn" ON public.goods_receipts FOR SELECT TO authenticated USING (public.is_finance(auth.uid()));
CREATE POLICY "finance_insert_grn" ON public.goods_receipts FOR INSERT TO authenticated WITH CHECK (public.is_finance(auth.uid()));
CREATE POLICY "finance_update_grn" ON public.goods_receipts FOR UPDATE TO authenticated USING (public.is_finance(auth.uid())) WITH CHECK (public.is_finance(auth.uid()));
CREATE POLICY "admin_delete_grn" ON public.goods_receipts FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.goods_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id uuid NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id uuid REFERENCES public.purchase_order_items(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  received_qty integer NOT NULL DEFAULT 0,
  rejected_qty integer NOT NULL DEFAULT 0,
  accepted_qty integer NOT NULL DEFAULT 0,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  tax_percent numeric(6,2) NOT NULL DEFAULT 0,
  batch_no text,
  expiry_date date,
  selling_price numeric(12,2),
  batch_id uuid REFERENCES public.product_batches(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_grn_items_receipt ON public.goods_receipt_items(goods_receipt_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goods_receipt_items TO authenticated;
GRANT ALL ON public.goods_receipt_items TO service_role;
ALTER TABLE public.goods_receipt_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance_read_grn_items" ON public.goods_receipt_items FOR SELECT TO authenticated USING (public.is_finance(auth.uid()));
CREATE POLICY "finance_insert_grn_items" ON public.goods_receipt_items FOR INSERT TO authenticated WITH CHECK (public.is_finance(auth.uid()));
CREATE POLICY "finance_update_grn_items" ON public.goods_receipt_items FOR UPDATE TO authenticated USING (public.is_finance(auth.uid())) WITH CHECK (public.is_finance(auth.uid()));
CREATE POLICY "admin_delete_grn_items" ON public.goods_receipt_items FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Supplier payable / transaction history
CREATE TABLE IF NOT EXISTS public.supplier_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  goods_receipt_id uuid REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  txn_type text NOT NULL DEFAULT 'bill',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  method text,
  reference text,
  txn_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_bill_per_grn ON public.supplier_transactions(goods_receipt_id) WHERE txn_type = 'bill';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_transactions TO authenticated;
GRANT ALL ON public.supplier_transactions TO service_role;
ALTER TABLE public.supplier_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance_read_supplier_txn" ON public.supplier_transactions FOR SELECT TO authenticated USING (public.is_finance(auth.uid()));
CREATE POLICY "finance_insert_supplier_txn" ON public.supplier_transactions FOR INSERT TO authenticated WITH CHECK (public.is_finance(auth.uid()));
CREATE POLICY "finance_update_supplier_txn" ON public.supplier_transactions FOR UPDATE TO authenticated USING (public.is_finance(auth.uid())) WITH CHECK (public.is_finance(auth.uid()));
CREATE POLICY "admin_delete_supplier_txn" ON public.supplier_transactions FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Apply a received line: batch, stock movement, PO progress, supplier bill
CREATE OR REPLACE FUNCTION public.grn_item_apply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _grn public.goods_receipts; _poi public.purchase_order_items; _cat product_category;
        _batch uuid; _billed numeric;
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

  SELECT category INTO _cat FROM public.products WHERE id = NEW.product_id;

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
    END IF;

    INSERT INTO public.stock_movements (product_id, branch_id, change_qty, reason, reference_id, batch_no, expiry_date, created_by)
    VALUES (NEW.product_id, _grn.branch_id, NEW.accepted_qty, 'purchase', _grn.id, NEW.batch_no, NEW.expiry_date, auth.uid());

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

  -- supplier payable: one bill per goods receipt, kept in sync
  _billed := COALESCE(NEW.accepted_qty * NEW.unit_cost * (1 + COALESCE(NEW.tax_percent,0)/100), 0);
  IF _grn.supplier_id IS NOT NULL THEN
    INSERT INTO public.supplier_transactions (supplier_id, purchase_order_id, goods_receipt_id, txn_type, amount, reference, txn_date, created_by)
    VALUES (_grn.supplier_id, _grn.purchase_order_id, _grn.id, 'bill', _billed, _grn.grn_no, _grn.received_at::date, auth.uid())
    ON CONFLICT (goods_receipt_id) WHERE txn_type = 'bill'
    DO UPDATE SET amount = public.supplier_transactions.amount + EXCLUDED.amount;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_grn_item_apply ON public.goods_receipt_items;
CREATE TRIGGER trg_grn_item_apply BEFORE INSERT ON public.goods_receipt_items
  FOR EACH ROW EXECUTE FUNCTION public.grn_item_apply();

CREATE OR REPLACE FUNCTION public.grn_item_after()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _po uuid;
BEGIN
  SELECT purchase_order_id INTO _po FROM public.goods_receipts WHERE id = NEW.goods_receipt_id;
  IF _po IS NOT NULL THEN PERFORM public.po_recalc(_po); END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_grn_item_after ON public.goods_receipt_items;
CREATE TRIGGER trg_grn_item_after AFTER INSERT ON public.goods_receipt_items
  FOR EACH ROW EXECUTE FUNCTION public.grn_item_after();

-- backfill amounts for existing PO items
UPDATE public.purchase_order_items SET quantity = quantity;