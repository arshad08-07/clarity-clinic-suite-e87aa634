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
    NEW.invoice_no := OLD.invoice_no;
    NEW.subtotal := OLD.subtotal;
    NEW.tax := OLD.tax;
    NEW.total := OLD.total;
    NEW.paid_amount := OLD.paid_amount;
    NEW.status := OLD.status;
    IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
      NEW.is_legacy := OLD.is_legacy;
      NEW.legacy_reason := OLD.legacy_reason;
    END IF;
    IF COALESCE(NEW.is_legacy, OLD.is_legacy) THEN
      NEW.discount := OLD.discount;
    ELSE
      NEW.discount := GREATEST(COALESCE(NEW.discount,0), 0);
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.invoice_header_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.invoice_item_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_invoice(uuid) FROM PUBLIC, anon, authenticated;