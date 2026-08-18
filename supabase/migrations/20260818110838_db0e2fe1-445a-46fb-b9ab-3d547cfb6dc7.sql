-- Enhance audit function: redact sensitive keys, record changed field list
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _details jsonb;
  _old jsonb;
  _new jsonb;
  _changed text[];
  _k text;
  _redact text[] := ARRAY['password','passwd','token','secret','api_key','access_token','refresh_token','encrypted_password'];
BEGIN
  IF TG_OP <> 'INSERT' THEN _old := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN _new := to_jsonb(NEW); END IF;

  -- strip credential-like keys, never store them in audit trail
  IF _old IS NOT NULL THEN
    FOREACH _k IN ARRAY _redact LOOP _old := _old - _k; END LOOP;
  END IF;
  IF _new IS NOT NULL THEN
    FOREACH _k IN ARRAY _redact LOOP _new := _new - _k; END LOOP;
  END IF;

  IF TG_OP = 'INSERT' THEN
    _details := jsonb_build_object('new', _new);
  ELSIF TG_OP = 'UPDATE' THEN
    IF _new = _old THEN RETURN NULL; END IF;
    SELECT array_agg(key) INTO _changed
      FROM jsonb_each(_new) n
      WHERE n.value IS DISTINCT FROM (_old -> n.key);
    _details := jsonb_build_object('old', _old, 'new', _new, 'changed', to_jsonb(coalesce(_changed, '{}'::text[])));
  ELSE
    _details := jsonb_build_object('old', _old);
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, details)
  VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME,
          CASE WHEN TG_OP = 'DELETE' THEN (_old->>'id')::uuid ELSE (_new->>'id')::uuid END,
          _details);
  RETURN NULL;
END; $function$;

-- Attach audit trigger to remaining sensitive/business tables
DO $$
DECLARE t text;
  tables text[] := ARRAY[
    'products','product_batches','suppliers','supplier_transactions',
    'purchase_orders','purchase_order_items','goods_receipts','goods_receipt_items',
    'expenses','leads','lead_activities','communications','equipment','follow_ups',
    'optical_orders','optical_prescriptions','branches','profiles','user_branches',
    'iol_models','diagnostic_tests','diagnosis_catalog','ot_rooms','patient_documents',
    'notifications'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$s ON public.%1$I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I
       FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t);
  END LOOP;
END $$;