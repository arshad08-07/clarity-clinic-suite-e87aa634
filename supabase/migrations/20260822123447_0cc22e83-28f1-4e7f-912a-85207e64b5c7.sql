
-- ============ PHASE 1b/2: organization_id everywhere + isolation ============

-- Step 1: add the column everywhere first (audit trigger writes need it to exist).
DO $$
DECLARE t text;
  tables text[] := ARRAY[
    'branches','patients','appointments','visits','examinations','optometry_records',
    'patient_diagnoses','prescriptions','prescription_items','diagnostic_orders','diagnostic_tests',
    'surgeries','ot_rooms','iol_models','iol_inventory','products','product_batches','stock_movements',
    'suppliers','purchase_orders','purchase_order_items','goods_receipts','goods_receipt_items',
    'supplier_transactions','optical_prescriptions','optical_orders','pharmacy_sales','invoices',
    'invoice_items','payments','expenses','insurance_claims','claim_status_history','leads',
    'lead_activities','communications','follow_ups','notifications','equipment','patient_documents',
    'settings','audit_logs','user_roles','user_branches'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid', t);
  END LOOP;
END $$;

-- Step 2: audit rows record the tenant of the audited row.
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _details jsonb; _old jsonb; _new jsonb; _changed text[]; _k text; _org uuid;
  _redact text[] := ARRAY['password','passwd','token','secret','api_key','access_token','refresh_token','encrypted_password'];
BEGIN
  IF TG_OP <> 'INSERT' THEN _old := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN _new := to_jsonb(NEW); END IF;
  IF _old IS NOT NULL THEN FOREACH _k IN ARRAY _redact LOOP _old := _old - _k; END LOOP; END IF;
  IF _new IS NOT NULL THEN FOREACH _k IN ARRAY _redact LOOP _new := _new - _k; END LOOP; END IF;

  IF TG_OP = 'INSERT' THEN
    _details := jsonb_build_object('new', _new);
  ELSIF TG_OP = 'UPDATE' THEN
    IF _new = _old THEN RETURN NULL; END IF;
    SELECT array_agg(key) INTO _changed FROM jsonb_each(_new) n
      WHERE n.value IS DISTINCT FROM (_old -> n.key);
    _details := jsonb_build_object('old', _old, 'new', _new, 'changed', to_jsonb(coalesce(_changed, '{}'::text[])));
  ELSE
    _details := jsonb_build_object('old', _old);
  END IF;

  _org := COALESCE((_new->>'organization_id')::uuid, (_old->>'organization_id')::uuid, public.current_org_id());
  IF _org IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.audit_logs (organization_id, user_id, action, entity, entity_id, details)
  VALUES (_org, auth.uid(), lower(TG_OP), TG_TABLE_NAME,
          CASE WHEN TG_OP = 'DELETE' THEN (_old->>'id')::uuid ELSE (_new->>'id')::uuid END,
          _details);
  RETURN NULL;
END $$;

-- Step 3: backfill, lock down, index, isolate.
DO $$
DECLARE
  _org uuid := (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1);
  t text;
  tables text[] := ARRAY[
    'branches','patients','appointments','visits','examinations','optometry_records',
    'patient_diagnoses','prescriptions','prescription_items','diagnostic_orders','diagnostic_tests',
    'surgeries','ot_rooms','iol_models','iol_inventory','products','product_batches','stock_movements',
    'suppliers','purchase_orders','purchase_order_items','goods_receipts','goods_receipt_items',
    'supplier_transactions','optical_prescriptions','optical_orders','pharmacy_sales','invoices',
    'invoice_items','payments','expenses','insurance_claims','claim_status_history','leads',
    'lead_activities','communications','follow_ups','notifications','equipment','patient_documents',
    'settings','audit_logs','user_roles','user_branches'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('UPDATE public.%I SET organization_id = %L WHERE organization_id IS NULL', t, _org);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET DEFAULT public.current_org_id()', t);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_organization_id_fkey') THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE',
        t, t || '_organization_id_fkey');
    END IF;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (organization_id)', 'idx_' || t || '_org', t);
    -- Second line of defence: no query of any kind escapes its tenant.
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I AS RESTRICTIVE TO authenticated, anon
         USING (public.org_visible(organization_id)) WITH CHECK (public.org_visible(organization_id))', t);
  END LOOP;

  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_patients_org_branch ON public.patients (organization_id, branch_id)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_visits_org_branch ON public.visits (organization_id, branch_id, checked_in_at DESC)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_appointments_org_branch ON public.appointments (organization_id, branch_id, scheduled_at)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_org_branch ON public.invoices (organization_id, branch_id, created_at DESC)';
END $$;

-- profiles: nullable until onboarding assigns the account to an organization
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
UPDATE public.profiles SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
  WHERE organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles (organization_id);
DROP POLICY IF EXISTS tenant_isolation ON public.profiles;
CREATE POLICY tenant_isolation ON public.profiles AS RESTRICTIVE TO authenticated, anon
  USING (public.org_visible(organization_id) OR (organization_id IS NULL AND id = auth.uid()))
  WITH CHECK (public.org_visible(organization_id) OR (organization_id IS NULL AND id = auth.uid()));

-- ============ per-tenant uniqueness (was global) ============
ALTER TABLE public.branches DROP CONSTRAINT IF EXISTS branches_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS branches_org_code_key ON public.branches (organization_id, code);
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_mrn_key;
CREATE UNIQUE INDEX IF NOT EXISTS patients_org_mrn_key ON public.patients (organization_id, mrn);
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_invoice_no_key;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_org_no_key ON public.invoices (organization_id, invoice_no);
ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_po_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_org_no_key ON public.purchase_orders (organization_id, po_number);
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sku_key;
CREATE UNIQUE INDEX IF NOT EXISTS products_org_sku_key ON public.products (organization_id, sku);
ALTER TABLE public.diagnostic_tests DROP CONSTRAINT IF EXISTS diagnostic_tests_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS diagnostic_tests_org_code_key ON public.diagnostic_tests (organization_id, code);
ALTER TABLE public.iol_inventory DROP CONSTRAINT IF EXISTS iol_inventory_serial_no_key;
CREATE UNIQUE INDEX IF NOT EXISTS iol_inventory_org_serial_key ON public.iol_inventory (organization_id, serial_no);
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_branch_id_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS settings_org_branch_key ON public.settings (organization_id, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), key);
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_org_user_role_key ON public.user_roles (organization_id, user_id, role);

-- ============ child rows inherit the parent's tenant ============
CREATE OR REPLACE FUNCTION public.inherit_org_from_parent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _parent_org uuid; _parent_col text := TG_ARGV[0]; _parent_tbl text := TG_ARGV[1]; _parent_id uuid;
BEGIN
  EXECUTE format('SELECT ($1).%I', _parent_col) INTO _parent_id USING NEW;
  IF _parent_id IS NULL THEN RETURN NEW; END IF;
  EXECUTE format('SELECT organization_id FROM public.%I WHERE id = $1', _parent_tbl)
    INTO _parent_org USING _parent_id;
  IF _parent_org IS NULL THEN RETURN NEW; END IF;
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := _parent_org;
  ELSIF NEW.organization_id <> _parent_org THEN
    RAISE EXCEPTION 'Cross-organization reference is not allowed';
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('invoice_items','invoice_id','invoices'),
      ('payments','invoice_id','invoices'),
      ('prescription_items','prescription_id','prescriptions'),
      ('purchase_order_items','purchase_order_id','purchase_orders'),
      ('goods_receipt_items','goods_receipt_id','goods_receipts'),
      ('goods_receipts','purchase_order_id','purchase_orders'),
      ('claim_status_history','claim_id','insurance_claims'),
      ('lead_activities','lead_id','leads'),
      ('visits','patient_id','patients'),
      ('appointments','patient_id','patients'),
      ('examinations','patient_id','patients'),
      ('optometry_records','patient_id','patients'),
      ('patient_diagnoses','patient_id','patients'),
      ('prescriptions','patient_id','patients'),
      ('diagnostic_orders','patient_id','patients'),
      ('surgeries','patient_id','patients'),
      ('optical_prescriptions','patient_id','patients'),
      ('optical_orders','patient_id','patients'),
      ('pharmacy_sales','patient_id','patients'),
      ('patient_documents','patient_id','patients'),
      ('follow_ups','patient_id','patients'),
      ('insurance_claims','patient_id','patients'),
      ('product_batches','product_id','products'),
      ('stock_movements','product_id','products'),
      ('iol_inventory','iol_model_id','iol_models'),
      ('user_branches','branch_id','branches'),
      ('supplier_transactions','supplier_id','suppliers')
    ) AS v(child, col, parent)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_org_inherit ON public.%I', r.child);
    EXECUTE format(
      'CREATE TRIGGER trg_org_inherit BEFORE INSERT OR UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.inherit_org_from_parent(%L, %L)',
      r.child, r.col, r.parent);
  END LOOP;
END $$;

-- ============ tenant-aware settings, tokens, roles ============
CREATE OR REPLACE FUNCTION public.app_setting(_key text, _branch uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT value FROM public.settings
      WHERE key = _key AND branch_id = _branch AND organization_id = public.current_org_id() LIMIT 1),
    (SELECT value FROM public.settings
      WHERE key = _key AND branch_id IS NULL AND organization_id = public.current_org_id() LIMIT 1)
  )
$$;

CREATE OR REPLACE FUNCTION public.assign_visit_token()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.token_no IS NULL THEN
    SELECT COALESCE(MAX(v.token_no), 0) + 1 INTO NEW.token_no
    FROM public.visits v
    WHERE v.checked_in_at::date = COALESCE(NEW.checked_in_at, now())::date
      AND v.organization_id = NEW.organization_id
      AND v.branch_id IS NOT DISTINCT FROM NEW.branch_id;
  END IF;
  RETURN NEW;
END $$;

-- Signup no longer grants clinic access; onboarding or an admin invite does.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = _role
      AND ur.organization_id = public.current_org_id()
  )
$$;

REVOKE EXECUTE ON FUNCTION public.current_org_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_support_access(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.org_visible(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.inherit_org_from_parent() FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_support_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_visible(uuid) TO authenticated;
