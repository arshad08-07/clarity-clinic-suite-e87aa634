
-- ============ PHASE 1a: tenant core ============

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  max_branches integer,
  max_users integer,
  max_patients integer,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  legal_name text,
  contact_email text,
  contact_phone text,
  address text,
  city text,
  state text,
  country text NOT NULL DEFAULT 'India',
  logo_url text,
  primary_color text,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  currency text NOT NULL DEFAULT 'INR',
  plan_id uuid REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active',
  trial_ends_at timestamptz,
  suspended_at timestamptz,
  suspended_reason text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_status_chk CHECK (status IN ('trial','active','suspended','cancelled'))
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  is_owner boolean NOT NULL DEFAULT false,
  invited_by uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id),
  CONSTRAINT organization_members_status_chk CHECK (status IN ('invited','active','disabled'))
);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Time-boxed, audited support access into a tenant.
CREATE TABLE IF NOT EXISTS public.platform_support_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL,
  reason text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_grants_admin ON public.platform_support_grants(admin_user_id, organization_id);

GRANT SELECT ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
GRANT SELECT ON public.platform_support_grants TO authenticated;
GRANT ALL ON public.platform_support_grants TO service_role;

-- ============ helpers ============

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = _user_id AND pa.is_active)
$$;

-- The tenant a signed-in user belongs to. Never taken from client input.
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT om.organization_id
  FROM public.organization_members om
  WHERE om.user_id = auth.uid() AND om.status = 'active'
  ORDER BY om.joined_at
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = _org AND om.user_id = _user_id AND om.status = 'active'
  )
$$;

-- Platform admin may reach a tenant only through an unexpired support grant.
CREATE OR REPLACE FUNCTION public.has_support_access(_org uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_admin(_user_id) AND EXISTS (
    SELECT 1 FROM public.platform_support_grants g
    WHERE g.organization_id = _org AND g.admin_user_id = _user_id
      AND g.revoked_at IS NULL AND g.expires_at > now()
  )
$$;

-- Single predicate every tenant-owned table is gated on.
CREATE OR REPLACE FUNCTION public.org_visible(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _org IS NOT NULL AND (public.is_org_member(_org) OR public.has_support_access(_org))
$$;

-- ============ RLS on tenant core ============

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plans_read ON public.plans;
CREATE POLICY plans_read ON public.plans FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS plans_admin ON public.plans;
CREATE POLICY plans_admin ON public.plans FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organizations_read ON public.organizations;
CREATE POLICY organizations_read ON public.organizations FOR SELECT TO authenticated
  USING (public.org_visible(id) OR public.is_platform_admin());
DROP POLICY IF EXISTS organizations_update ON public.organizations;
CREATE POLICY organizations_update ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR (public.is_org_member(id) AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_platform_admin() OR (public.is_org_member(id) AND public.is_admin(auth.uid())));
DROP POLICY IF EXISTS organizations_insert ON public.organizations;
CREATE POLICY organizations_insert ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS organizations_delete ON public.organizations;
CREATE POLICY organizations_delete ON public.organizations FOR DELETE TO authenticated
  USING (public.is_platform_admin());

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_members_read ON public.organization_members;
CREATE POLICY org_members_read ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.org_visible(organization_id) OR public.is_platform_admin());
DROP POLICY IF EXISTS org_members_write ON public.organization_members;
CREATE POLICY org_members_write ON public.organization_members FOR ALL TO authenticated
  USING (public.is_platform_admin() OR (public.is_org_member(organization_id) AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_platform_admin() OR (public.is_org_member(organization_id) AND public.is_admin(auth.uid())));

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_admins_read ON public.platform_admins;
CREATE POLICY platform_admins_read ON public.platform_admins FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR user_id = auth.uid());
DROP POLICY IF EXISTS platform_admins_write ON public.platform_admins;
CREATE POLICY platform_admins_write ON public.platform_admins FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

ALTER TABLE public.platform_support_grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS support_grants_read ON public.platform_support_grants;
CREATE POLICY support_grants_read ON public.platform_support_grants FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_org_member(organization_id));
DROP POLICY IF EXISTS support_grants_write ON public.platform_support_grants;
CREATE POLICY support_grants_write ON public.platform_support_grants FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP TRIGGER IF EXISTS trg_org_updated_at ON public.organizations;
CREATE TRIGGER trg_org_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ seed plans + the existing clinic as tenant #1 ============

INSERT INTO public.plans (code, name, description, max_branches, max_users, max_patients, sort_order)
VALUES
  ('trial','Trial','14-day evaluation', 1, 5, 200, 0),
  ('starter','Starter','Single clinic', 1, 15, NULL, 1),
  ('growth','Growth','Multi-branch clinic group', 5, 75, NULL, 2),
  ('enterprise','Enterprise','Unlimited branches and users', NULL, NULL, NULL, 3)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.organizations (id, name, slug, status, onboarding_completed, plan_id)
SELECT '00000000-0000-0000-0000-0000000000a1', 'Vision Care', 'vision-care', 'active', true,
       (SELECT id FROM public.plans WHERE code = 'enterprise')
WHERE NOT EXISTS (SELECT 1 FROM public.organizations);

-- Everyone who already has a profile becomes a member of tenant #1.
INSERT INTO public.organization_members (organization_id, user_id, status, is_owner)
SELECT '00000000-0000-0000-0000-0000000000a1', p.id, 'active',
       EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'super_admin')
FROM public.profiles p
WHERE EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = '00000000-0000-0000-0000-0000000000a1')
ON CONFLICT (organization_id, user_id) DO NOTHING;
