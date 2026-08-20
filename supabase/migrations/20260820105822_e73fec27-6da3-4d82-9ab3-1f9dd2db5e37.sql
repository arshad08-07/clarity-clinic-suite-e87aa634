DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['claim_status_history','insurance_claims','payments','invoice_items','invoices','pharmacy_sales','prescription_items','prescriptions','patient_diagnoses','diagnostic_orders','examinations','optometry_records','optical_orders','optical_prescriptions','patient_documents','surgeries','follow_ups','communications','notifications','visits','appointments','lead_activities','leads','patients','stock_movements','product_batches','iol_inventory','goods_receipt_items','goods_receipts','purchase_order_items','purchase_orders','supplier_transactions','expenses','audit_logs','user_branches'])
  LOOP EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER USER', t); END LOOP;

  DELETE FROM public.claim_status_history;
  DELETE FROM public.insurance_claims;
  DELETE FROM public.payments;
  DELETE FROM public.invoice_items;
  DELETE FROM public.invoices;
  DELETE FROM public.pharmacy_sales;
  DELETE FROM public.prescription_items;
  DELETE FROM public.prescriptions;
  DELETE FROM public.patient_diagnoses;
  DELETE FROM public.diagnostic_orders;
  DELETE FROM public.examinations;
  DELETE FROM public.optometry_records;
  DELETE FROM public.optical_orders;
  DELETE FROM public.optical_prescriptions;
  DELETE FROM public.patient_documents;
  DELETE FROM public.surgeries;
  DELETE FROM public.follow_ups;
  DELETE FROM public.communications;
  DELETE FROM public.notifications;
  DELETE FROM public.visits;
  DELETE FROM public.appointments;
  DELETE FROM public.lead_activities;
  DELETE FROM public.leads;
  DELETE FROM public.patients;
  DELETE FROM public.stock_movements;
  DELETE FROM public.product_batches;
  DELETE FROM public.iol_inventory;
  DELETE FROM public.goods_receipt_items;
  DELETE FROM public.goods_receipts;
  DELETE FROM public.purchase_order_items;
  DELETE FROM public.purchase_orders;
  DELETE FROM public.supplier_transactions;
  DELETE FROM public.expenses;
  DELETE FROM public.audit_logs;
  DELETE FROM public.user_branches;

  FOR t IN SELECT unnest(ARRAY['claim_status_history','insurance_claims','payments','invoice_items','invoices','pharmacy_sales','prescription_items','prescriptions','patient_diagnoses','diagnostic_orders','examinations','optometry_records','optical_orders','optical_prescriptions','patient_documents','surgeries','follow_ups','communications','notifications','visits','appointments','lead_activities','leads','patients','stock_movements','product_batches','iol_inventory','goods_receipt_items','goods_receipts','purchase_order_items','purchase_orders','supplier_transactions','expenses','audit_logs','user_branches'])
  LOOP EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER USER', t); END LOOP;
END $$;

-- remove test-only catalog rows
ALTER TABLE public.products DISABLE TRIGGER USER;
DELETE FROM public.products WHERE name ILIKE 'ZZ %' OR name ILIKE '%test%';
UPDATE public.products SET stock_qty = 0;
ALTER TABLE public.products ENABLE TRIGGER USER;

-- remove development/test staff accounts (keeps real clinic accounts)
ALTER TABLE public.user_roles DISABLE TRIGGER USER;
ALTER TABLE public.profiles DISABLE TRIGGER USER;
DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM public.profiles WHERE email LIKE '%@test.local' OR full_name ILIKE 'PROBE %' OR full_name ILIKE 'Test %' OR full_name ILIKE 'RLS %');
DELETE FROM public.profiles WHERE email LIKE '%@test.local' OR full_name ILIKE 'PROBE %' OR full_name ILIKE 'Test %' OR full_name ILIKE 'RLS %';
ALTER TABLE public.profiles ENABLE TRIGGER USER;
ALTER TABLE public.user_roles ENABLE TRIGGER USER;

-- remove RLS test branches
ALTER TABLE public.branches DISABLE TRIGGER USER;
DELETE FROM public.settings WHERE branch_id IN ('aaaaaaaa-0000-4000-8000-00000000000a','bbbbbbbb-0000-4000-8000-00000000000b');
DELETE FROM public.branches WHERE id IN ('aaaaaaaa-0000-4000-8000-00000000000a','bbbbbbbb-0000-4000-8000-00000000000b');
ALTER TABLE public.branches ENABLE TRIGGER USER;