-- 1. multi-branch assignment table
CREATE TABLE IF NOT EXISTS public.user_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, branch_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_branches TO authenticated;
GRANT ALL ON public.user_branches TO service_role;
ALTER TABLE public.user_branches ENABLE ROW LEVEL SECURITY;

-- 2. helper functions
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.user_branch_ids(_user_id uuid)
RETURNS TABLE(branch_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.branch_id FROM public.profiles p WHERE p.id = _user_id AND p.branch_id IS NOT NULL
  UNION
  SELECT ub.branch_id FROM public.user_branches ub WHERE ub.user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.can_access_branch(_branch uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN public.is_super_admin(auth.uid()) THEN true
    WHEN _branch IS NULL THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_branch_ids(auth.uid()) b WHERE b.branch_id = _branch)
  END
$$;

CREATE OR REPLACE FUNCTION public.same_branch(_branch uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_access_branch(_branch)
$$;

CREATE OR REPLACE FUNCTION public.can_access_patient(_patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.patients p WHERE p.id = _patient_id AND public.can_access_branch(p.branch_id))
$$;

CREATE OR REPLACE FUNCTION public.can_access_invoice(_invoice_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = _invoice_id AND public.can_access_branch(i.branch_id))
$$;

CREATE OR REPLACE FUNCTION public.can_access_po(_po_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.purchase_orders o WHERE o.id = _po_id AND public.can_access_branch(o.branch_id))
$$;

CREATE OR REPLACE FUNCTION public.can_access_grn(_grn_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.goods_receipts g WHERE g.id = _grn_id AND public.can_access_branch(g.branch_id))
$$;

CREATE OR REPLACE FUNCTION public.can_access_prescription(_rx_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.prescriptions r WHERE r.id = _rx_id AND public.can_access_patient(r.patient_id))
$$;

CREATE OR REPLACE FUNCTION public.can_access_lead(_lead_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.leads l WHERE l.id = _lead_id AND public.can_access_branch(l.branch_id))
$$;

-- 3. backfill unassigned records to the primary branch so nothing is orphaned
DO $$
DECLARE b uuid;
BEGIN
  SELECT id INTO b FROM public.branches WHERE is_active ORDER BY created_at LIMIT 1;
  IF b IS NOT NULL THEN
    UPDATE public.appointments SET branch_id = b WHERE branch_id IS NULL;
    UPDATE public.visits SET branch_id = b WHERE branch_id IS NULL;
    UPDATE public.patients SET branch_id = b WHERE branch_id IS NULL;
    UPDATE public.invoices SET branch_id = b WHERE branch_id IS NULL;
    UPDATE public.pharmacy_sales SET branch_id = b WHERE branch_id IS NULL;
    UPDATE public.stock_movements SET branch_id = b WHERE branch_id IS NULL;
    UPDATE public.iol_inventory SET branch_id = b WHERE branch_id IS NULL;
    UPDATE public.optical_orders SET branch_id = b WHERE branch_id IS NULL;
    UPDATE public.surgeries SET branch_id = b WHERE branch_id IS NULL;
    UPDATE public.expenses SET branch_id = b WHERE branch_id IS NULL;
    UPDATE public.leads SET branch_id = b WHERE branch_id IS NULL;
    UPDATE public.equipment SET branch_id = b WHERE branch_id IS NULL;
    UPDATE public.purchase_orders SET branch_id = b WHERE branch_id IS NULL;
    UPDATE public.goods_receipts SET branch_id = b WHERE branch_id IS NULL;
    UPDATE public.product_batches SET branch_id = b WHERE branch_id IS NULL;
    UPDATE public.ot_rooms SET branch_id = b WHERE branch_id IS NULL;
  END IF;
END $$;

-- 4. role assignment security
DROP POLICY IF EXISTS roles_admin_all ON public.user_roles;
DROP POLICY IF EXISTS roles_select ON public.user_roles;

CREATE POLICY roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY roles_admin_insert ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    AND user_id <> auth.uid()
    AND (role NOT IN ('super_admin','clinic_admin') OR public.is_super_admin(auth.uid()))
  );
CREATE POLICY roles_admin_update ON public.user_roles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) AND user_id <> auth.uid())
  WITH CHECK (
    public.is_admin(auth.uid())
    AND user_id <> auth.uid()
    AND (role NOT IN ('super_admin','clinic_admin') OR public.is_super_admin(auth.uid()))
  );
CREATE POLICY roles_admin_delete ON public.user_roles FOR DELETE TO authenticated
  USING (
    public.is_admin(auth.uid())
    AND user_id <> auth.uid()
    AND (role NOT IN ('super_admin','clinic_admin') OR public.is_super_admin(auth.uid()))
  );

CREATE OR REPLACE FUNCTION public.guard_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _target uuid;
BEGIN
  IF _uid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  _target := COALESCE(NEW.user_id, OLD.user_id);
  IF _target = _uid THEN
    RAISE EXCEPTION 'You cannot change your own role';
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.role IN ('super_admin','clinic_admin') AND NOT public.is_super_admin(_uid) THEN
    RAISE EXCEPTION 'Only a super admin can grant administrator roles';
  END IF;
  IF TG_OP = 'DELETE' AND OLD.role = 'super_admin'
     AND (SELECT COUNT(*) FROM public.user_roles WHERE role = 'super_admin') <= 1 THEN
    RAISE EXCEPTION 'The last super admin cannot be removed';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_guard_role_change ON public.user_roles;
CREATE TRIGGER trg_guard_role_change BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.guard_role_change();

DROP POLICY IF EXISTS user_branches_select ON public.user_branches;
CREATE POLICY user_branches_select ON public.user_branches FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY user_branches_admin_ins ON public.user_branches FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND (public.is_super_admin(auth.uid()) OR public.can_access_branch(branch_id)));
CREATE POLICY user_branches_admin_del ON public.user_branches FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_profile_branch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.branch_id IS DISTINCT FROM OLD.branch_id
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only an administrator can change branch assignment';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_profile_branch ON public.profiles;
CREATE TRIGGER trg_guard_profile_branch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_branch();