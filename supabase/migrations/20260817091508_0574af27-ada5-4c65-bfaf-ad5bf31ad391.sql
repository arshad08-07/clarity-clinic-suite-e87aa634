-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin','clinic_admin','receptionist','doctor','optometrist','nurse','pharmacist','optical_staff','inventory_manager','accountant','diagnostic_staff','crm_staff','patient');
CREATE TYPE public.gender_t AS ENUM ('male','female','other');
CREATE TYPE public.appointment_status AS ENUM ('scheduled','confirmed','checked_in','in_progress','completed','cancelled','no_show');
CREATE TYPE public.visit_status AS ENUM ('waiting','optometry','with_doctor','diagnostics','billing','completed','cancelled');
CREATE TYPE public.lead_status AS ENUM ('new','contacted','qualified','converted','lost');
CREATE TYPE public.eye_side AS ENUM ('OD','OS','OU');
CREATE TYPE public.order_status AS ENUM ('ordered','sample_collected','in_progress','completed','cancelled');
CREATE TYPE public.surgery_status AS ENUM ('planned','scheduled','in_progress','completed','postponed','cancelled');
CREATE TYPE public.payment_status AS ENUM ('unpaid','partial','paid','refunded');
CREATE TYPE public.po_status AS ENUM ('draft','sent','partially_received','received','cancelled');
CREATE TYPE public.product_category AS ENUM ('medicine','frame','lens','contact_lens','iol','consumable','equipment_part','other');

-- ============ CORE ============
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  address text, city text, state text, country text DEFAULT 'India',
  phone text, email text, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  designation text,
  specialization text,
  registration_no text,
  is_active boolean NOT NULL DEFAULT true,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role <> 'patient')
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','clinic_admin'))
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE first_user boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO first_user;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN first_user THEN 'super_admin'::public.app_role ELSE 'receptionist'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ PATIENTS / CRM ============
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn text UNIQUE NOT NULL,
  user_id uuid,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text,
  gender public.gender_t,
  date_of_birth date,
  phone text NOT NULL,
  email text,
  address text, city text, state text, pincode text,
  blood_group text,
  allergies text,
  medical_history text,
  emergency_contact_name text,
  emergency_contact_phone text,
  insurance_provider text,
  insurance_policy_no text,
  referred_by text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.patients (phone);
CREATE INDEX ON public.patients (branch_id);

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL, phone text NOT NULL, email text,
  source text, interest text, notes text,
  status public.lead_status NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  converted_patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ APPOINTMENTS / QUEUE ============
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  duration_min int NOT NULL DEFAULT 15,
  reason text,
  appointment_type text DEFAULT 'consultation',
  status public.appointment_status NOT NULL DEFAULT 'scheduled',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.appointments (scheduled_at);

CREATE TABLE public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  doctor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  token_no int,
  status public.visit_status NOT NULL DEFAULT 'waiting',
  chief_complaint text,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ CLINICAL ============
CREATE TABLE public.optometry_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  optometrist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ucva_od text, ucva_os text, bcva_od text, bcva_os text,
  sph_od numeric(5,2), cyl_od numeric(5,2), axis_od int, add_od numeric(4,2),
  sph_os numeric(5,2), cyl_os numeric(5,2), axis_os int, add_os numeric(4,2),
  pd numeric(5,1),
  iop_od numeric(5,2), iop_os numeric(5,2), iop_method text DEFAULT 'NCT',
  color_vision text, keratometry text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.examinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  doctor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  history text, chief_complaint text,
  lids_od text, lids_os text,
  conjunctiva_od text, conjunctiva_os text,
  cornea_od text, cornea_os text,
  anterior_chamber_od text, anterior_chamber_os text,
  pupil_od text, pupil_os text,
  lens_od text, lens_os text,
  fundus_od text, fundus_os text,
  cataract_grade_od text, cataract_grade_os text,
  advice text, plan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.diagnosis_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, name text NOT NULL, category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  diagnosis_id uuid REFERENCES public.diagnosis_catalog(id) ON DELETE SET NULL,
  diagnosis_text text,
  eye public.eye_side DEFAULT 'OU',
  severity text, notes text,
  diagnosed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  doctor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text, follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  drug_name text NOT NULL,
  eye public.eye_side,
  dosage text, frequency text, duration text, instructions text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.optical_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  prescribed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'spectacles',
  sph_od numeric(5,2), cyl_od numeric(5,2), axis_od int, add_od numeric(4,2), prism_od text,
  sph_os numeric(5,2), cyl_os numeric(5,2), axis_os int, add_os numeric(4,2), prism_os text,
  pd numeric(5,1), base_curve numeric(5,2), diameter numeric(5,2),
  lens_type text, coating text, remarks text,
  valid_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ DIAGNOSTICS ============
CREATE TABLE public.diagnostic_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, name text NOT NULL, category text,
  price numeric(12,2) NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.diagnostic_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  test_id uuid REFERENCES public.diagnostic_tests(id) ON DELETE SET NULL,
  eye public.eye_side DEFAULT 'OU',
  ordered_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  performed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'ordered',
  findings text, impression text, report_url text,
  performed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ SURGERY / OT / IOL ============
CREATE TABLE public.ot_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.iol_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, manufacturer text, model_code text, type text,
  unit_cost numeric(12,2) DEFAULT 0, price numeric(12,2) DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.iol_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iol_model_id uuid NOT NULL REFERENCES public.iol_models(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  serial_no text UNIQUE NOT NULL,
  power numeric(5,2),
  expiry_date date,
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.surgeries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  surgeon_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ot_room_id uuid REFERENCES public.ot_rooms(id) ON DELETE SET NULL,
  procedure text NOT NULL,
  eye public.eye_side NOT NULL DEFAULT 'OD',
  scheduled_at timestamptz,
  status public.surgery_status NOT NULL DEFAULT 'planned',
  anesthesia text,
  biometry_axial_length numeric(6,2), biometry_k1 numeric(6,2), biometry_k2 numeric(6,2),
  iol_power numeric(5,2),
  iol_inventory_id uuid REFERENCES public.iol_inventory(id) ON DELETE SET NULL,
  pre_op_notes text, op_notes text, post_op_notes text, complications text,
  estimated_cost numeric(12,2) DEFAULT 0,
  consent_signed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  surgery_id uuid REFERENCES public.surgeries(id) ON DELETE SET NULL,
  visit_id uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  due_date date NOT NULL,
  type text DEFAULT 'post_op',
  notes text,
  is_done boolean NOT NULL DEFAULT false,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ INVENTORY / PROCUREMENT ============
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, contact_person text, phone text, email text, address text,
  gst_no text, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  category public.product_category NOT NULL DEFAULT 'medicine',
  brand text, unit text DEFAULT 'unit',
  hsn_code text, tax_percent numeric(5,2) NOT NULL DEFAULT 0,
  cost_price numeric(12,2) NOT NULL DEFAULT 0,
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  reorder_level int NOT NULL DEFAULT 10,
  stock_qty int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  change_qty int NOT NULL,
  reason text NOT NULL DEFAULT 'adjustment',
  reference_id uuid,
  batch_no text, expiry_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  status public.po_status NOT NULL DEFAULT 'draft',
  order_date date NOT NULL DEFAULT current_date,
  expected_date date,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity int NOT NULL DEFAULT 1,
  received_qty int NOT NULL DEFAULT 0,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ BILLING ============
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text UNIQUE NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  visit_id uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  invoice_type text NOT NULL DEFAULT 'consultation',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  tax numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  status public.payment_status NOT NULL DEFAULT 'unpaid',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  item_type text NOT NULL DEFAULT 'service',
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  tax_percent numeric(5,2) NOT NULL DEFAULT 0,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  method text NOT NULL DEFAULT 'cash',
  reference text,
  received_by uuid,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  amount numeric(12,2) NOT NULL,
  expense_date date NOT NULL DEFAULT current_date,
  paid_to text, payment_method text DEFAULT 'cash',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  provider text NOT NULL,
  policy_no text,
  claim_no text,
  claim_amount numeric(12,2) NOT NULL DEFAULT 0,
  approved_amount numeric(12,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'submitted',
  submitted_at date DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ OPS ============
CREATE TABLE public.communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'call',
  direction text NOT NULL DEFAULT 'outbound',
  subject text, message text,
  status text NOT NULL DEFAULT 'logged',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL, serial_no text, manufacturer text,
  purchase_date date, warranty_until date,
  last_service_date date, next_service_date date,
  status text NOT NULL DEFAULT 'operational',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL, body text, link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, key)
);

-- ============ GRANTS + RLS ============
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['branches','patients','leads','appointments','visits','optometry_records','examinations','diagnosis_catalog','patient_diagnoses','prescriptions','prescription_items','optical_prescriptions','diagnostic_tests','diagnostic_orders','ot_rooms','iol_models','iol_inventory','surgeries','follow_ups','suppliers','products','stock_movements','purchase_orders','purchase_order_items','invoices','invoice_items','payments','expenses','insurance_claims','communications','equipment','settings']) LOOP
    EXECUTE format('CREATE POLICY "staff_read_%1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "staff_write_%1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "staff_update_%1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "admin_delete_%1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.is_admin(auth.uid()))', t);
  END LOOP;
END $$;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_insert_admin" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) OR id = auth.uid());

CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "notif_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_insert_staff" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "audit_read_admin" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "audit_insert_staff" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "patient_self_read" ON public.patients FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "patient_self_rx" ON public.prescriptions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = prescriptions.patient_id AND p.user_id = auth.uid()));
CREATE POLICY "patient_self_appt" ON public.appointments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = appointments.patient_id AND p.user_id = auth.uid()));
CREATE POLICY "patient_self_invoice" ON public.invoices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = invoices.patient_id AND p.user_id = auth.uid()));

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           JOIN pg_attribute a ON a.attrelid=c.oid AND a.attname='updated_at'
           WHERE n.nspname='public' AND c.relkind='r' LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

CREATE SEQUENCE public.mrn_seq START 1001;
CREATE SEQUENCE public.invoice_seq START 1001;
CREATE SEQUENCE public.po_seq START 1001;

CREATE OR REPLACE FUNCTION public.next_mrn() RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 'MRN-' || to_char(nextval('public.mrn_seq'), 'FM000000')
$$;
CREATE OR REPLACE FUNCTION public.next_invoice_no() RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 'INV-' || to_char(nextval('public.invoice_seq'), 'FM000000')
$$;
CREATE OR REPLACE FUNCTION public.next_po_no() RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 'PO-' || to_char(nextval('public.po_seq'), 'FM000000')
$$;
GRANT USAGE ON SEQUENCE public.mrn_seq, public.invoice_seq, public.po_seq TO authenticated, service_role;