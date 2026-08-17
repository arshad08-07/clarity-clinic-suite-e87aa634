REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.next_mrn() FROM anon;
REVOKE EXECUTE ON FUNCTION public.next_invoice_no() FROM anon;
REVOKE EXECUTE ON FUNCTION public.next_po_no() FROM anon;

INSERT INTO public.branches (id, name, code, address, city, state, phone, email) VALUES
 ('11111111-1111-1111-1111-111111111111','Vision Care Eye Hospital — Main','MAIN','12 MG Road','Bengaluru','Karnataka','+91 80 4000 1000','main@visioncare.example');

INSERT INTO public.diagnosis_catalog (code, name, category) VALUES
 ('H25.9','Age-related cataract, unspecified','Cataract'),
 ('H40.11','Primary open-angle glaucoma','Glaucoma'),
 ('H35.03','Diabetic retinopathy','Retina'),
 ('H52.1','Myopia','Refractive'),
 ('H52.0','Hypermetropia','Refractive'),
 ('H52.2','Astigmatism','Refractive'),
 ('H52.4','Presbyopia','Refractive'),
 ('H04.12','Dry eye syndrome','Ocular surface'),
 ('H10.9','Conjunctivitis','Ocular surface'),
 ('H35.31','Age-related macular degeneration','Retina'),
 ('H33.2','Retinal detachment','Retina'),
 ('H11.0','Pterygium','Ocular surface'),
 ('H50.0','Esotropia','Squint'),
 ('H47.0','Optic neuropathy','Neuro-ophthalmology');

INSERT INTO public.diagnostic_tests (code, name, category, price) VALUES
 ('OCT','Optical Coherence Tomography','Imaging',2500),
 ('VF','Visual Field (Perimetry)','Functional',1800),
 ('BIO','A-Scan Biometry','Pre-operative',1200),
 ('PACHY','Pachymetry','Anterior segment',900),
 ('TOPO','Corneal Topography','Anterior segment',1500),
 ('FFA','Fundus Fluorescein Angiography','Imaging',3500),
 ('BSCAN','B-Scan Ultrasound','Imaging',1400),
 ('FUNDUS','Fundus Photography','Imaging',800),
 ('SPEC','Specular Microscopy','Anterior segment',1100),
 ('IOLM','IOL Master Biometry','Pre-operative',2000);

INSERT INTO public.ot_rooms (branch_id, name) VALUES
 ('11111111-1111-1111-1111-111111111111','OT 1 — Phaco'),
 ('11111111-1111-1111-1111-111111111111','OT 2 — Retina'),
 ('11111111-1111-1111-1111-111111111111','OT 3 — Minor Procedures');

INSERT INTO public.iol_models (id, name, manufacturer, model_code, type, unit_cost, price) VALUES
 ('22222222-0000-0000-0000-000000000001','Monofocal Aspheric','Alcon','SN60WF','monofocal',6000,12000),
 ('22222222-0000-0000-0000-000000000002','Trifocal','Zeiss','AT LISA tri 839MP','trifocal',42000,72000),
 ('22222222-0000-0000-0000-000000000003','Toric Monofocal','J&J','ZCT300','toric',18000,32000);

INSERT INTO public.iol_inventory (iol_model_id, branch_id, serial_no, power, expiry_date) VALUES
 ('22222222-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','IOL-A-1001',21.0,'2028-01-31'),
 ('22222222-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','IOL-A-1002',21.5,'2028-01-31'),
 ('22222222-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','IOL-A-1003',22.0,'2028-03-31'),
 ('22222222-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','IOL-T-2001',20.5,'2027-11-30'),
 ('22222222-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','IOL-C-3001',23.0,'2027-09-30');

INSERT INTO public.suppliers (name, contact_person, phone, email, gst_no) VALUES
 ('OptiMed Distributors','Ravi Kumar','+91 98450 11223','sales@optimed.example','29ABCDE1234F1Z5'),
 ('LensPro Optics','Sneha Rao','+91 98450 44556','orders@lenspro.example','29PQRST5678G1Z2'),
 ('Alcon India','Vikram Shah','+91 98450 77889','india@alcon.example','27ALCON1234H1Z9');

INSERT INTO public.products (sku, name, category, brand, unit, tax_percent, cost_price, selling_price, reorder_level, stock_qty) VALUES
 ('MED-001','Moxifloxacin 0.5% Eye Drops','medicine','OptiMed','bottle',12,60,110,20,120),
 ('MED-002','Carboxymethylcellulose 0.5%','medicine','OptiMed','bottle',12,90,165,20,80),
 ('MED-003','Prednisolone Acetate 1%','medicine','OptiMed','bottle',12,85,150,15,45),
 ('MED-004','Timolol 0.5% Eye Drops','medicine','OptiMed','bottle',12,70,130,15,30),
 ('MED-005','Latanoprost 0.005%','medicine','OptiMed','bottle',12,210,390,10,18),
 ('FRM-001','Titanium Rimless Frame','frame','VisionX','piece',18,1800,4500,5,22),
 ('FRM-002','Acetate Full Rim Frame','frame','VisionX','piece',18,900,2400,5,40),
 ('LNS-001','Single Vision AR Lens (pair)','lens','LensPro','pair',18,600,1600,10,60),
 ('LNS-002','Progressive Lens (pair)','lens','LensPro','pair',18,3200,7800,5,15),
 ('CL-001','Monthly Soft Contact Lens (pair)','contact_lens','ClearSight','pair',12,700,1400,10,35),
 ('CL-002','Daily Disposable CL (30 pack)','contact_lens','ClearSight','box',12,1100,2100,10,25),
 ('CON-001','Viscoelastic Gel','consumable','Alcon','unit',12,850,1500,10,40),
 ('CON-002','Surgical Blade 2.8mm','consumable','Alcon','piece',12,120,240,25,150);

INSERT INTO public.equipment (branch_id, name, serial_no, manufacturer, purchase_date, warranty_until, next_service_date, status) VALUES
 ('11111111-1111-1111-1111-111111111111','Zeiss Cirrus OCT','OCT-9931','Zeiss','2023-04-10','2026-04-10','2026-10-01','operational'),
 ('11111111-1111-1111-1111-111111111111','Humphrey Field Analyzer','HFA-2210','Zeiss','2022-08-01','2025-08-01','2026-09-15','operational'),
 ('11111111-1111-1111-1111-111111111111','Phaco Machine Centurion','PHC-5521','Alcon','2024-01-20','2027-01-20','2026-11-05','operational'),
 ('11111111-1111-1111-1111-111111111111','Slit Lamp SL-990','SL-1187','Appasamy','2021-06-15','2024-06-15','2026-09-30','needs_service');

INSERT INTO public.patients (id, mrn, branch_id, first_name, last_name, gender, date_of_birth, phone, email, city, blood_group, allergies) VALUES
 ('33333333-0000-0000-0000-000000000001', public.next_mrn(),'11111111-1111-1111-1111-111111111111','Anita','Sharma','female','1958-03-12','+91 98800 10001','anita.sharma@example.com','Bengaluru','B+','None'),
 ('33333333-0000-0000-0000-000000000002', public.next_mrn(),'11111111-1111-1111-1111-111111111111','Rahul','Verma','male','1990-07-22','+91 98800 10002','rahul.verma@example.com','Bengaluru','O+','Sulfa drugs'),
 ('33333333-0000-0000-0000-000000000003', public.next_mrn(),'11111111-1111-1111-1111-111111111111','Meera','Iyer','female','1975-11-05','+91 98800 10003','meera.iyer@example.com','Bengaluru','A+','None'),
 ('33333333-0000-0000-0000-000000000004', public.next_mrn(),'11111111-1111-1111-1111-111111111111','Suresh','Nair','male','1949-01-30','+91 98800 10004','suresh.nair@example.com','Bengaluru','AB+','Penicillin'),
 ('33333333-0000-0000-0000-000000000005', public.next_mrn(),'11111111-1111-1111-1111-111111111111','Fatima','Khan','female','2001-05-18','+91 98800 10005','fatima.khan@example.com','Bengaluru','B-','None');

INSERT INTO public.appointments (branch_id, patient_id, scheduled_at, reason, appointment_type, status) VALUES
 ('11111111-1111-1111-1111-111111111111','33333333-0000-0000-0000-000000000001', now() + interval '2 hour','Blurred vision, cataract review','consultation','scheduled'),
 ('11111111-1111-1111-1111-111111111111','33333333-0000-0000-0000-000000000002', now() + interval '1 day','Routine eye check','consultation','scheduled'),
 ('11111111-1111-1111-1111-111111111111','33333333-0000-0000-0000-000000000003', now() + interval '2 day','Glaucoma follow-up','follow_up','scheduled'),
 ('11111111-1111-1111-1111-111111111111','33333333-0000-0000-0000-000000000004', now() + interval '3 day','Pre-operative assessment','pre_op','scheduled');

INSERT INTO public.leads (branch_id, name, phone, email, source, interest, status) VALUES
 ('11111111-1111-1111-1111-111111111111','Deepak Gowda','+91 98800 20001','deepak@example.com','website','LASIK enquiry','new'),
 ('11111111-1111-1111-1111-111111111111','Priya Menon','+91 98800 20002','priya@example.com','walk_in','Cataract surgery cost','contacted'),
 ('11111111-1111-1111-1111-111111111111','Arjun Rao','+91 98800 20003',NULL,'referral','Spectacles','qualified');

INSERT INTO public.settings (branch_id, key, value) VALUES
 ('11111111-1111-1111-1111-111111111111','clinic_profile','{"name":"Vision Care Eye Hospital","currency":"INR","consultation_fee":600,"tax_percent":18}'::jsonb);