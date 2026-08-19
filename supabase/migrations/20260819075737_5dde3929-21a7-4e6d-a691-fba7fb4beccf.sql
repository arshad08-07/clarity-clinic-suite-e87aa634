
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS original_payment_id uuid REFERENCES public.payments(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id),
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS refunded_by uuid,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_status text,
  ADD COLUMN IF NOT EXISTS is_legacy_refund boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legacy_reason text,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_payments_original ON public.payments(original_payment_id);

-- how much of a positive payment is still refundable
CREATE OR REPLACE FUNCTION public.payment_refundable(_payment_id uuid)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT GREATEST(
    COALESCE((SELECT amount FROM public.payments WHERE id = _payment_id AND amount > 0), 0)
    - COALESCE((SELECT SUM(ABS(amount)) FROM public.payments WHERE original_payment_id = _payment_id AND amount < 0), 0),
  0)
$$;

CREATE OR REPLACE FUNCTION public.refund_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _orig public.payments%ROWTYPE;
  _refundable numeric;
  _limit numeric;
  _uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id
       OR NEW.original_payment_id IS DISTINCT FROM OLD.original_payment_id THEN
      IF NOT public.is_admin(_uid) THEN
        RAISE EXCEPTION 'Payment amount and refund linkage cannot be changed after the fact';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- positive payments: never carry refund linkage
  IF NEW.amount > 0 THEN
    IF NEW.original_payment_id IS NOT NULL THEN
      RAISE EXCEPTION 'A collection cannot reference an original payment';
    END IF;
    NEW.refund_status := NULL;
    NEW.refund_reason := NULL;
    NEW.refunded_by := NULL;
    NEW.refunded_at := NULL;
    NEW.is_legacy_refund := false;
  ELSE
    -- refunds
    IF NEW.is_legacy_refund THEN
      RAISE EXCEPTION 'Legacy refunds cannot be created; they only exist for historical data';
    END IF;
    IF NEW.original_payment_id IS NULL THEN
      RAISE EXCEPTION 'A refund must reference the original payment it reverses';
    END IF;
    IF COALESCE(btrim(NEW.refund_reason), '') = '' THEN
      RAISE EXCEPTION 'A refund reason is required';
    END IF;

    SELECT * INTO _orig FROM public.payments WHERE id = NEW.original_payment_id FOR UPDATE;
    IF _orig.id IS NULL THEN
      RAISE EXCEPTION 'Original payment not found';
    END IF;
    IF _orig.amount <= 0 THEN
      RAISE EXCEPTION 'A refund cannot reverse another refund';
    END IF;
    IF _orig.invoice_id <> NEW.invoice_id THEN
      RAISE EXCEPTION 'The refund and the original payment must belong to the same invoice';
    END IF;

    _refundable := public.payment_refundable(_orig.id);
    IF ABS(NEW.amount) > _refundable + 0.009 THEN
      RAISE EXCEPTION 'Refund exceeds the refundable amount of the original payment (% remaining)', _refundable;
    END IF;

    _limit := COALESCE((public.app_setting('billing', (SELECT branch_id FROM public.invoices WHERE id = NEW.invoice_id)) ->> 'refund_approval_limit')::numeric, 5000);
    IF ABS(NEW.amount) > _limit THEN
      IF NEW.approved_by IS NULL THEN
        RAISE EXCEPTION 'Refunds above % require an authorised approver', _limit;
      END IF;
      IF NOT (public.is_admin(NEW.approved_by) OR public.is_super_admin(NEW.approved_by)) THEN
        RAISE EXCEPTION 'The selected approver is not authorised to approve refunds';
      END IF;
      NEW.approved_at := COALESCE(NEW.approved_at, now());
    ELSE
      IF NEW.approved_by IS NOT NULL AND NOT (public.is_admin(NEW.approved_by) OR public.is_super_admin(NEW.approved_by)) THEN
        RAISE EXCEPTION 'The selected approver is not authorised to approve refunds';
      END IF;
      IF NEW.approved_by IS NOT NULL THEN NEW.approved_at := COALESCE(NEW.approved_at, now()); END IF;
    END IF;

    NEW.refunded_by := COALESCE(NEW.refunded_by, _uid);
    NEW.refunded_at := COALESCE(NEW.refunded_at, now());
    NEW.refund_status := COALESCE(NEW.refund_status, 'completed');
    NEW.method := COALESCE(NEW.method, _orig.method);
  END IF;

  NEW.patient_id := COALESCE(NEW.patient_id, (SELECT patient_id FROM public.invoices WHERE id = NEW.invoice_id));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_refund_guard ON public.payments;
CREATE TRIGGER trg_refund_guard
BEFORE INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.refund_guard();

-- immutable audit entry for each refund
CREATE OR REPLACE FUNCTION public.refund_audit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.amount < 0 THEN
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, details)
    VALUES (auth.uid(), 'refund', 'payments', NEW.id, jsonb_build_object(
      'original_payment_id', NEW.original_payment_id,
      'invoice_id', NEW.invoice_id,
      'patient_id', NEW.patient_id,
      'amount', ABS(NEW.amount),
      'reason', NEW.refund_reason,
      'refunded_by', NEW.refunded_by,
      'approved_by', NEW.approved_by,
      'approved_at', NEW.approved_at,
      'status', NEW.refund_status,
      'is_legacy_refund', NEW.is_legacy_refund,
      'refunded_at', NEW.refunded_at
    ));
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_refund_audit ON public.payments;
CREATE TRIGGER trg_refund_audit
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.refund_audit();

-- classify existing historical refunds without inventing a linkage
UPDATE public.payments p SET
  is_legacy_refund = true,
  refund_status = 'legacy',
  refund_reason = COALESCE(refund_reason, 'Historical refund recorded before the refund model existed'),
  legacy_reason = 'Unlinked historical refund — no original payment reference available',
  refunded_at = COALESCE(refunded_at, p.paid_at),
  patient_id = COALESCE(p.patient_id, (SELECT i.patient_id FROM public.invoices i WHERE i.id = p.invoice_id))
WHERE p.amount < 0 AND p.original_payment_id IS NULL;
