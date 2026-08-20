
-- Reduce SECURITY DEFINER exposure for the new RLS helpers (anon has no business calling them)
REVOKE EXECUTE ON FUNCTION public.can_read_clinical(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_read_medication(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_read_optical_rx(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_clinical(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_medication(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_optical_rx(uuid) TO authenticated;

-- Access-matrix probe fixtures: RLS test branches that the probe profiles are scoped to.
-- Deterministic ids, matching the branch_id values referenced by the probe rows below.
INSERT INTO public.branches (id, name, code, city, is_active) VALUES
  ('aaaaaaaa-0000-4000-8000-00000000000a','RLS Test Branch A','RLSA','Bengaluru', true),
  ('bbbbbbbb-0000-4000-8000-00000000000b','RLS Test Branch B','RLSB','Bengaluru', true)
ON CONFLICT (id) DO NOTHING;

-- Temporary probe users, one per role, all scoped to branch A, for the access matrix test
INSERT INTO public.profiles (id, full_name, branch_id, is_active) VALUES
  ('aa000001-0000-4000-8000-000000000001','PROBE super_admin','aaaaaaaa-0000-4000-8000-00000000000a', true),
  ('aa000002-0000-4000-8000-000000000002','PROBE doctor','aaaaaaaa-0000-4000-8000-00000000000a', true),
  ('aa000003-0000-4000-8000-000000000003','PROBE optometrist','aaaaaaaa-0000-4000-8000-00000000000a', true),
  ('aa000004-0000-4000-8000-000000000004','PROBE diagnostic_staff','aaaaaaaa-0000-4000-8000-00000000000a', true),
  ('aa000005-0000-4000-8000-000000000005','PROBE receptionist','aaaaaaaa-0000-4000-8000-00000000000a', true),
  ('aa000006-0000-4000-8000-000000000006','PROBE pharmacist','aaaaaaaa-0000-4000-8000-00000000000a', true),
  ('aa000007-0000-4000-8000-000000000007','PROBE optical_staff','aaaaaaaa-0000-4000-8000-00000000000a', true),
  ('aa000008-0000-4000-8000-000000000008','PROBE accountant','aaaaaaaa-0000-4000-8000-00000000000a', true),
  ('aa000009-0000-4000-8000-000000000009','PROBE inventory_manager','aaaaaaaa-0000-4000-8000-00000000000a', true),
  ('aa000010-0000-4000-8000-000000000010','PROBE crm_staff','aaaaaaaa-0000-4000-8000-00000000000a', true),
  ('aa000011-0000-4000-8000-000000000011','PROBE nurse','aaaaaaaa-0000-4000-8000-00000000000a', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role) VALUES
  ('aa000001-0000-4000-8000-000000000001','super_admin'),
  ('aa000002-0000-4000-8000-000000000002','doctor'),
  ('aa000003-0000-4000-8000-000000000003','optometrist'),
  ('aa000004-0000-4000-8000-000000000004','diagnostic_staff'),
  ('aa000005-0000-4000-8000-000000000005','receptionist'),
  ('aa000006-0000-4000-8000-000000000006','pharmacist'),
  ('aa000007-0000-4000-8000-000000000007','optical_staff'),
  ('aa000008-0000-4000-8000-000000000008','accountant'),
  ('aa000009-0000-4000-8000-000000000009','inventory_manager'),
  ('aa000010-0000-4000-8000-000000000010','crm_staff'),
  ('aa000011-0000-4000-8000-000000000011','nurse')
ON CONFLICT (user_id, role) DO NOTHING;
