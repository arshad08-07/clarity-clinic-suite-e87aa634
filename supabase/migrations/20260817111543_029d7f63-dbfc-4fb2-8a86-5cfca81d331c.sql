ALTER TABLE public.diagnostic_orders
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS doctor_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_diag_orders_visit ON public.diagnostic_orders(visit_id);
CREATE INDEX IF NOT EXISTS idx_diag_orders_status ON public.diagnostic_orders(status);

CREATE OR REPLACE FUNCTION public.diagnostic_order_stamps()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'in_progress' AND NEW.started_at IS NULL THEN NEW.started_at := now(); END IF;
    IF NEW.status = 'completed' AND NEW.performed_at IS NULL THEN NEW.performed_at := now(); END IF;
    IF NEW.status = 'reviewed' AND NEW.reviewed_at IS NULL THEN
      NEW.reviewed_at := now();
      NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_diag_order_stamps ON public.diagnostic_orders;
CREATE TRIGGER trg_diag_order_stamps BEFORE UPDATE ON public.diagnostic_orders
FOR EACH ROW EXECUTE FUNCTION public.diagnostic_order_stamps();

ALTER TABLE public.diagnostic_orders REPLICA IDENTITY FULL;
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.diagnostic_orders';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.diagnostic_tests (code, name, category, price, is_active) VALUES
  ('OCT','OCT (Optical Coherence Tomography)','imaging',2500,true),
  ('VF','Visual Field','functional',1500,true),
  ('BIOM','Biometry','biometry',1200,true),
  ('PACHY','Pachymetry','anterior',800,true),
  ('FUNDUS','Fundus Photography','imaging',1000,true),
  ('ASCAN','A-Scan','ultrasound',900,true),
  ('BSCAN','B-Scan','ultrasound',1400,true),
  ('KERAT','Keratometry','anterior',600,true),
  ('IOP','IOP Measurement','functional',300,true),
  ('OTHER','Other Investigation','other',0,true)
ON CONFLICT (code) DO NOTHING;