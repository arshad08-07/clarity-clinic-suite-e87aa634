
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT p.active_organization_id
       FROM public.profiles p
       JOIN public.organization_members om
         ON om.organization_id = p.active_organization_id
        AND om.user_id = p.id AND om.status = 'active'
      WHERE p.id = auth.uid()),
    (SELECT om.organization_id
       FROM public.organization_members om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
      ORDER BY om.joined_at
      LIMIT 1)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.current_org_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated;
