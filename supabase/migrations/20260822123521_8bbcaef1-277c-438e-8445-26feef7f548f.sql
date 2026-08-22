
DO $$
DECLARE r record;
  -- Routines the signed-in app actually calls directly.
  keep_authenticated text[] := ARRAY[
    'checkin_appointment','create_walk_in_visit','convert_lead_to_patient','lead_patient_matches',
    'available_iol_inventory','payment_refundable','product_batch_qty','app_setting','has_role',
    'is_admin','is_super_admin','is_staff','is_clinical','is_finance','can_access_branch','same_branch',
    'can_access_patient','can_access_invoice','can_access_lead','can_access_po','can_access_grn',
    'can_access_prescription','can_read_clinical','can_read_medication','can_read_optical_rx',
    'can_convert_leads','owns_patient','user_branch_ids','follow_up_state','next_mrn','next_invoice_no',
    'next_po_no','current_org_id','is_org_member','is_platform_admin','has_support_access','org_visible',
    'collection_by_day','collection_by_method','collection_totals','revenue_by_stream',
    'receivables_summary','expense_total','crm_funnel','dispatch_due_reminders','recalc_invoice','po_recalc'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig, p.proname, p.prorettype = 'trigger'::regtype AS is_trigger
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, public', r.sig);
    IF r.is_trigger OR NOT (r.proname = ANY (keep_authenticated)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;
