DO $$
DECLARE
  v_patient uuid := '33333333-0000-0000-0000-000000000001';
  v_branch  uuid := '11111111-1111-1111-1111-111111111111';
  v_branch_b uuid := 'bbbbbbbb-0000-4000-8000-00000000000b';
  v_inv uuid;
  v_today date := (now() at time zone 'UTC')::date;
  v_yest  date := (now() at time zone 'UTC')::date - 1;
  base_today numeric; base_yest numeric; base_ref numeric; base_b numeric;
  r record;
BEGIN
  SELECT collected, refunds INTO base_today, base_ref FROM public.collection_totals(v_today, v_today, NULL, NULL);
  SELECT collected INTO base_yest FROM public.collection_totals(v_yest, v_yest, NULL, NULL);
  SELECT collected INTO base_b FROM public.collection_totals(v_yest, v_today, v_branch_b, NULL);

  -- billable test invoice (number + totals are server-generated)
  INSERT INTO public.invoices (patient_id, branch_id, invoice_type, status)
  VALUES (v_patient, v_branch, 'other', 'unpaid') RETURNING id INTO v_inv;
  INSERT INTO public.invoice_items (invoice_id, description, item_type, quantity, unit_price, tax_percent)
  VALUES (v_inv, 'REPORT TEST SERVICE', 'service', 1, 5000, 0);

  -- Test 1: invoice dated today, payment recorded yesterday
  INSERT INTO public.payments (invoice_id, amount, method, paid_at)
  VALUES (v_inv, 300, 'cash', (v_yest::timestamp + interval '10 hour') at time zone 'UTC');
  -- Test 2: partial payment today
  INSERT INTO public.payments (invoice_id, amount, method, paid_at) VALUES (v_inv, 250, 'card', now());
  -- Test 4: refund today (negative amount = existing refund model)
  INSERT INTO public.payments (invoice_id, amount, method, paid_at) VALUES (v_inv, -50, 'card', now());
  -- Test 5: exceed any 500-row cap
  INSERT INTO public.payments (invoice_id, amount, method, paid_at)
  SELECT v_inv, 1, 'upi', now() FROM generate_series(1, 600);

  -- Test 3 + 1: per-day attribution
  SELECT collected INTO r FROM public.collection_totals(v_yest, v_yest, NULL, NULL);
  IF (SELECT collected FROM public.collection_totals(v_yest, v_yest, NULL, NULL)) <> base_yest + 300 THEN
    RAISE EXCEPTION 'FAIL yesterday collections';
  END IF;
  IF (SELECT collected FROM public.collection_totals(v_today, v_today, NULL, NULL)) <> base_today + 850 THEN
    RAISE EXCEPTION 'FAIL today collections (expected +850, got %)',
      (SELECT collected FROM public.collection_totals(v_today, v_today, NULL, NULL)) - base_today;
  END IF;
  IF (SELECT refunds FROM public.collection_totals(v_today, v_today, NULL, NULL)) <> base_ref + 50 THEN
    RAISE EXCEPTION 'FAIL refunds';
  END IF;
  IF (SELECT net FROM public.collection_totals(v_today, v_today, NULL, NULL))
     <> (SELECT collected - refunds FROM public.collection_totals(v_today, v_today, NULL, NULL)) THEN
    RAISE EXCEPTION 'FAIL net reconciliation';
  END IF;
  -- Test 5: 603 transactions counted, none capped
  IF (SELECT txns FROM public.collection_totals(v_today, v_today, NULL, NULL)) < 602 THEN
    RAISE EXCEPTION 'FAIL row cap: only % txns', (SELECT txns FROM public.collection_totals(v_today, v_today, NULL, NULL));
  END IF;
  -- method filter
  IF (SELECT collected FROM public.collection_totals(v_today, v_today, NULL, 'upi')) < 600 THEN
    RAISE EXCEPTION 'FAIL method filter';
  END IF;
  -- Test 6: branch isolation
  IF (SELECT collected FROM public.collection_totals(v_yest, v_today, v_branch_b, NULL)) <> base_b THEN
    RAISE EXCEPTION 'FAIL branch isolation';
  END IF;
  -- outstanding reconciles with invoice ledger
  IF (SELECT paid_amount FROM public.invoices WHERE id = v_inv) <> 1100 THEN
    RAISE EXCEPTION 'FAIL invoice paid_amount %', (SELECT paid_amount FROM public.invoices WHERE id = v_inv);
  END IF;

  -- cleanup: restore the ledger exactly
  DELETE FROM public.payments WHERE invoice_id = v_inv;
  DELETE FROM public.invoice_items WHERE invoice_id = v_inv;
  DELETE FROM public.invoices WHERE id = v_inv;

  IF (SELECT collected FROM public.collection_totals(v_today, v_today, NULL, NULL)) <> base_today THEN
    RAISE EXCEPTION 'FAIL cleanup';
  END IF;
  RAISE NOTICE 'ALL REPORT AGGREGATION TESTS PASSED';
END $$;