DO $smoke$
DECLARE
  _admin uuid := 'b9238c9c-2793-45bf-b958-ea7aa5b2e936';
  _branch uuid := '11111111-1111-1111-1111-111111111111';
  _bra uuid := 'aaaaaaaa-0000-4000-8000-00000000000a';
  _brb uuid := 'bbbbbbbb-0000-4000-8000-00000000000b';
  _rls_user uuid := '7d3f42fc-efa8-4c7d-b0ff-31be57e96b83';
  _t0 timestamptz := now();

  _sup uuid; _prod uuid; _po uuid; _poi uuid; _grn uuid;
  _frame uuid; _lens uuid; _pat uuid; _rx uuid; _oo uuid;
  _inv uuid; _inv2 uuid; _lead uuid; _appt uuid; _visit uuid;
  _n numeric; _i integer; _txt text; _b boolean;
  _patient public.patients; _v public.visits;
  _made_admin boolean := false; _made_rls boolean := false;
BEGIN
  -- Fixtures: on a fresh database these staff profiles do not exist yet. Create them
  -- temporarily (deterministic ids, same branch scoping the assertions expect) so the
  -- smoke test can run from zero; they are removed again in the CLEANUP block below.
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _admin) THEN
    INSERT INTO public.profiles (id, full_name, is_active) VALUES (_admin, 'ZZ Smoke Admin', true);
    INSERT INTO public.user_roles (user_id, role) VALUES (_admin, 'super_admin') ON CONFLICT DO NOTHING;
    _made_admin := true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _rls_user) THEN
    INSERT INTO public.profiles (id, full_name, branch_id, is_active)
    VALUES (_rls_user, 'ZZ Smoke RLS User A', _bra, true);
    INSERT INTO public.user_roles (user_id, role) VALUES (_rls_user, 'receptionist') ON CONFLICT DO NOTHING;
    _made_rls := true;
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', _admin::text, 'role', 'authenticated')::text, true);

  -- A. PROCUREMENT
  INSERT INTO public.suppliers (name, contact_person, phone, gst_no)
  VALUES ('ZZ Smoke Optics Supplies', 'Test Contact', '9999000001', 'ZZGST0001')
  RETURNING id INTO _sup;

  INSERT INTO public.products (sku, name, category, unit, tax_percent, cost_price, selling_price, reorder_level, batch_tracked)
  VALUES ('ZZ-SMOKE-MED', 'ZZ Smoke Eye Drops', 'medicine', 'bottle', 12, 50, 90, 5, true)
  RETURNING id INTO _prod;

  INSERT INTO public.purchase_orders (po_number, supplier_id, branch_id, status, order_date, expected_date, created_by)
  VALUES (public.next_po_no(), _sup, _branch, 'sent', current_date, current_date + 3, _admin)
  RETURNING id INTO _po;

  INSERT INTO public.purchase_order_items (purchase_order_id, product_id, quantity, unit_cost, tax_percent)
  VALUES (_po, _prod, 10, 50, 12) RETURNING id INTO _poi;

  INSERT INTO public.goods_receipts (purchase_order_id, supplier_id, branch_id, received_by, invoice_ref)
  VALUES (_po, _sup, _branch, _admin, 'ZZ-BILL-1') RETURNING id INTO _grn;

  INSERT INTO public.goods_receipt_items
    (goods_receipt_id, purchase_order_item_id, product_id, received_qty, rejected_qty, unit_cost, tax_percent, batch_no, expiry_date, selling_price)
  VALUES (_grn, _poi, _prod, 10, 1, 50, 12, 'ZZB-1', current_date + 365, 95);

  SELECT stock_qty INTO _i FROM public.products WHERE id = _prod;
  IF _i <> 9 THEN RAISE EXCEPTION 'PROCUREMENT FAIL: stock_qty=% expected 9', _i; END IF;

  SELECT quantity INTO _i FROM public.product_batches WHERE product_id = _prod AND batch_no = 'ZZB-1';
  IF COALESCE(_i,0) <> 9 THEN RAISE EXCEPTION 'PROCUREMENT FAIL: batch qty=%', _i; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.stock_movements WHERE product_id = _prod AND reason = 'purchase' AND change_qty = 9) THEN
    RAISE EXCEPTION 'PROCUREMENT FAIL: no stock movement';
  END IF;

  SELECT received_qty INTO _i FROM public.purchase_order_items WHERE id = _poi;
  IF _i <> 9 THEN RAISE EXCEPTION 'PROCUREMENT FAIL: po received_qty=%', _i; END IF;

  SELECT amount INTO _n FROM public.supplier_transactions WHERE goods_receipt_id = _grn AND txn_type = 'bill';
  IF round(COALESCE(_n,0),2) <> 504.00 THEN RAISE EXCEPTION 'PROCUREMENT FAIL: payable=% expected 504', _n; END IF;

  INSERT INTO public.supplier_transactions (supplier_id, purchase_order_id, goods_receipt_id, txn_type, amount, method, txn_date, created_by)
  VALUES (_sup, _po, _grn, 'payment', 300, 'bank', current_date, _admin);

  IF NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE entity = 'purchase_orders' AND entity_id = _po) THEN
    RAISE EXCEPTION 'PROCUREMENT FAIL: no audit log for purchase order';
  END IF;

  -- B. OPTICAL
  INSERT INTO public.products (sku, name, category, unit, tax_percent, cost_price, selling_price, reorder_level, stock_qty)
  VALUES ('ZZ-SMOKE-FRM', 'ZZ Smoke Frame', 'frame', 'pc', 12, 800, 2000, 2, 10)
  RETURNING id INTO _frame;
  INSERT INTO public.products (sku, name, category, unit, tax_percent, cost_price, selling_price, reorder_level, stock_qty)
  VALUES ('ZZ-SMOKE-LNS', 'ZZ Smoke Lens', 'lens', 'pair', 12, 600, 1500, 2, 10)
  RETURNING id INTO _lens;

  INSERT INTO public.patients (mrn, branch_id, first_name, last_name, phone, gender)
  VALUES (public.next_mrn(), _branch, 'ZZSmoke', 'Optical', '9999000002', 'female')
  RETURNING id INTO _pat;

  INSERT INTO public.optical_prescriptions (patient_id, prescribed_by, type, sph_od, cyl_od, axis_od, sph_os, cyl_os, axis_os, pd)
  VALUES (_pat, _admin, 'glasses', -1.5, -0.5, 180, -1.75, -0.25, 175, 62)
  RETURNING id INTO _rx;

  INSERT INTO public.optical_orders
    (branch_id, patient_id, optical_prescription_id, frame_product_id, lens_od_product_id, lens_os_product_id,
     quantity, cost_price, selling_price, frame_price, lens_od_price, lens_os_price, tax_percent, status, created_by)
  VALUES (_branch, _pat, _rx, _frame, _lens, _lens, 1, 1400, 3500, 2000, 750, 750, 12, 'ordered', _admin)
  RETURNING id INTO _oo;

  SELECT stock_qty INTO _i FROM public.products WHERE id = _frame;
  IF _i <> 9 THEN RAISE EXCEPTION 'OPTICAL FAIL: frame stock=% expected 9', _i; END IF;
  SELECT stock_applied INTO _b FROM public.optical_orders WHERE id = _oo;
  IF NOT _b THEN RAISE EXCEPTION 'OPTICAL FAIL: stock not reserved'; END IF;

  INSERT INTO public.invoices (branch_id, patient_id, invoice_type, created_by)
  VALUES (_branch, _pat, 'optical', _admin) RETURNING id INTO _inv;

  SELECT invoice_no INTO _txt FROM public.invoices WHERE id = _inv;
  IF _txt IS NULL OR _txt = '' THEN RAISE EXCEPTION 'OPTICAL FAIL: invoice number not generated'; END IF;

  INSERT INTO public.invoice_items (invoice_id, description, item_type, quantity, unit_price, tax_percent, source_type, source_id)
  VALUES (_inv, 'ZZ Smoke spectacles (frame + lenses)', 'optical', 1, 3500, 12, 'optical_order', _oo);

  SELECT total INTO _n FROM public.invoices WHERE id = _inv;
  IF round(_n,2) <> 3920.00 THEN RAISE EXCEPTION 'OPTICAL FAIL: invoice total=% expected 3920', _n; END IF;

  UPDATE public.optical_orders SET invoice_id = _inv, status = 'processing' WHERE id = _oo;

  INSERT INTO public.payments (invoice_id, patient_id, amount, method, received_by)
  VALUES (_inv, _pat, _n, 'card', _admin);

  SELECT status::text INTO _txt FROM public.invoices WHERE id = _inv;
  IF _txt <> 'paid' THEN RAISE EXCEPTION 'OPTICAL FAIL: invoice status=%', _txt; END IF;

  UPDATE public.optical_orders SET status = 'ready' WHERE id = _oo;
  UPDATE public.optical_orders SET status = 'delivered' WHERE id = _oo;
  SELECT status, delivered_at IS NOT NULL INTO _txt, _b FROM public.optical_orders WHERE id = _oo;
  IF _txt <> 'delivered' OR NOT _b THEN RAISE EXCEPTION 'OPTICAL FAIL: delivery not recorded (%,%)', _txt, _b; END IF;

  -- C. CRM
  INSERT INTO public.leads (branch_id, name, phone, email, source, campaign, interest, status, assigned_to)
  VALUES (_branch, 'ZZ Smoke Lead', '9999000003', 'zz.smoke@example.test', 'facebook', 'ZZSMOKE', 'cataract', 'new', _admin)
  RETURNING id INTO _lead;

  INSERT INTO public.lead_activities (lead_id, activity, outcome, next_action_at, created_by)
  VALUES (_lead, 'call', 'interested', now() + interval '1 day', _admin);
  UPDATE public.leads SET status = 'contacted' WHERE id = _lead;

  INSERT INTO public.appointments (branch_id, lead_id, scheduled_at, duration_min, appointment_type, reason, status, created_by)
  VALUES (_branch, _lead, date_trunc('minute', now()) + interval '30 minutes', 15, 'consultation', 'ZZ smoke enquiry', 'scheduled', _admin)
  RETURNING id INTO _appt;

  SELECT * INTO _patient FROM public.convert_lead_to_patient(_lead, NULL, true);
  IF _patient.id IS NULL THEN RAISE EXCEPTION 'CRM FAIL: conversion returned no patient'; END IF;

  SELECT status::text INTO _txt FROM public.leads WHERE id = _lead;
  IF _txt <> 'converted' THEN RAISE EXCEPTION 'CRM FAIL: lead status=%', _txt; END IF;
  IF (SELECT patient_id FROM public.appointments WHERE id = _appt) IS DISTINCT FROM _patient.id THEN
    RAISE EXCEPTION 'CRM FAIL: appointment not attached to converted patient';
  END IF;

  SELECT * INTO _v FROM public.checkin_appointment(_appt);
  _visit := _v.id;
  IF _visit IS NULL OR _v.token_no IS NULL THEN RAISE EXCEPTION 'CRM FAIL: check-in produced no visit/token'; END IF;

  INSERT INTO public.invoices (branch_id, patient_id, visit_id, invoice_type, created_by)
  VALUES (_branch, _patient.id, _visit, 'consultation', _admin) RETURNING id INTO _inv2;
  INSERT INTO public.invoice_items (invoice_id, description, item_type, quantity, unit_price, tax_percent, source_type, source_id)
  VALUES (_inv2, 'ZZ Smoke consultation', 'service', 1, 1500, 0, 'visit', _visit);
  INSERT INTO public.payments (invoice_id, patient_id, amount, method, received_by)
  VALUES (_inv2, _patient.id, 1500, 'cash', _admin);

  SELECT revenue INTO _n FROM public.crm_funnel(current_date - 1, current_date + 1) WHERE campaign = 'ZZSMOKE';
  IF COALESCE(_n,0) < 1500 THEN RAISE EXCEPTION 'CRM FAIL: funnel revenue=% expected >= 1500', _n; END IF;
  SELECT patients INTO _i FROM public.crm_funnel(current_date - 1, current_date + 1) WHERE campaign = 'ZZSMOKE';
  IF COALESCE(_i,0) < 1 THEN RAISE EXCEPTION 'CRM FAIL: funnel patient attribution missing'; END IF;

  -- D. MULTI-BRANCH ACCESS
  INSERT INTO public.user_branches (user_id, branch_id) VALUES (_rls_user, _brb);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', _rls_user::text, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO _i FROM public.user_branch_ids(_rls_user);
  IF _i <> 2 THEN RAISE EXCEPTION 'BRANCH FAIL: user_branch_ids=% expected 2', _i; END IF;
  IF NOT public.can_access_branch(_bra) THEN RAISE EXCEPTION 'BRANCH FAIL: home branch denied'; END IF;
  IF NOT public.can_access_branch(_brb) THEN RAISE EXCEPTION 'BRANCH FAIL: assigned branch denied'; END IF;
  IF public.can_access_branch(_branch) THEN RAISE EXCEPTION 'BRANCH FAIL: unauthorised branch allowed'; END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', _admin::text, 'role', 'authenticated')::text, true);

  -- CLEANUP
  DELETE FROM public.user_branches WHERE user_id = _rls_user AND branch_id = _brb;

  DELETE FROM public.payments WHERE invoice_id IN (_inv, _inv2);
  DELETE FROM public.invoice_items WHERE invoice_id IN (_inv, _inv2);
  UPDATE public.optical_orders SET invoice_id = NULL WHERE id = _oo;
  DELETE FROM public.invoices WHERE id IN (_inv, _inv2);
  DELETE FROM public.optical_orders WHERE id = _oo;
  DELETE FROM public.optical_prescriptions WHERE id = _rx;

  DELETE FROM public.communications WHERE patient_id IN (_pat, _patient.id) OR lead_id = _lead;
  DELETE FROM public.follow_ups WHERE patient_id IN (_pat, _patient.id);
  DELETE FROM public.visits WHERE id = _visit;
  DELETE FROM public.appointments WHERE id = _appt;
  DELETE FROM public.lead_activities WHERE lead_id = _lead;
  UPDATE public.leads SET converted_patient_id = NULL WHERE id = _lead;
  DELETE FROM public.patients WHERE id IN (_pat, _patient.id);
  DELETE FROM public.leads WHERE id = _lead;

  DELETE FROM public.supplier_transactions WHERE supplier_id = _sup;
  DELETE FROM public.goods_receipt_items WHERE goods_receipt_id = _grn;
  DELETE FROM public.goods_receipts WHERE id = _grn;
  DELETE FROM public.purchase_order_items WHERE purchase_order_id = _po;
  DELETE FROM public.purchase_orders WHERE id = _po;
  DELETE FROM public.stock_movements WHERE product_id IN (_prod, _frame, _lens);
  DELETE FROM public.product_batches WHERE product_id = _prod;
  DELETE FROM public.products WHERE id IN (_prod, _frame, _lens);
  DELETE FROM public.suppliers WHERE id = _sup;

  IF _made_rls THEN
    DELETE FROM public.user_roles WHERE user_id = _rls_user;
    DELETE FROM public.profiles WHERE id = _rls_user;
  END IF;
  IF _made_admin THEN
    -- drop the acting-user claim first; role changes are self-edit guarded
    PERFORM set_config('request.jwt.claims', '', true);
    DELETE FROM public.user_roles WHERE user_id = _admin;
    DELETE FROM public.profiles WHERE id = _admin;
  END IF;

  DELETE FROM public.notifications WHERE created_at >= _t0;
  DELETE FROM public.audit_logs WHERE created_at >= _t0;

  RAISE NOTICE 'SMOKE TESTS PASSED: procurement, optical, CRM, multi-branch';
END
$smoke$;