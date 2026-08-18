-- Branch-scoped access across all operational tables

-- patients
DROP POLICY IF EXISTS staff_read_patients ON public.patients;
DROP POLICY IF EXISTS staff_write_patients ON public.patients;
DROP POLICY IF EXISTS staff_update_patients ON public.patients;
DROP POLICY IF EXISTS admin_delete_patients ON public.patients;
CREATE POLICY staff_read_patients ON public.patients FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY staff_write_patients ON public.patients FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY staff_update_patients ON public.patients FOR UPDATE TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(branch_id)) WITH CHECK (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY admin_delete_patients ON public.patients FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id));

-- appointments
DROP POLICY IF EXISTS staff_write_appointments ON public.appointments;
DROP POLICY IF EXISTS staff_update_appointments ON public.appointments;
DROP POLICY IF EXISTS admin_delete_appointments ON public.appointments;
CREATE POLICY staff_write_appointments ON public.appointments FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY staff_update_appointments ON public.appointments FOR UPDATE TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(branch_id)) WITH CHECK (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY admin_delete_appointments ON public.appointments FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id));

-- visits
DROP POLICY IF EXISTS staff_write_visits ON public.visits;
DROP POLICY IF EXISTS staff_update_visits ON public.visits;
DROP POLICY IF EXISTS admin_delete_visits ON public.visits;
CREATE POLICY staff_write_visits ON public.visits FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY staff_update_visits ON public.visits FOR UPDATE TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(branch_id)) WITH CHECK (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY admin_delete_visits ON public.visits FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id));

-- patient-derived clinical records
DROP POLICY IF EXISTS staff_read_examinations ON public.examinations;
DROP POLICY IF EXISTS clinical_insert_examinations ON public.examinations;
DROP POLICY IF EXISTS clinical_update_examinations ON public.examinations;
CREATE POLICY staff_read_examinations ON public.examinations FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY clinical_insert_examinations ON public.examinations FOR INSERT TO authenticated WITH CHECK (is_clinical(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY clinical_update_examinations ON public.examinations FOR UPDATE TO authenticated USING (is_clinical(auth.uid()) AND can_access_patient(patient_id)) WITH CHECK (is_clinical(auth.uid()) AND can_access_patient(patient_id));

DROP POLICY IF EXISTS staff_read_optometry_records ON public.optometry_records;
DROP POLICY IF EXISTS clinical_insert_optometry_records ON public.optometry_records;
DROP POLICY IF EXISTS clinical_update_optometry_records ON public.optometry_records;
CREATE POLICY staff_read_optometry_records ON public.optometry_records FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY clinical_insert_optometry_records ON public.optometry_records FOR INSERT TO authenticated WITH CHECK (is_clinical(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY clinical_update_optometry_records ON public.optometry_records FOR UPDATE TO authenticated USING (is_clinical(auth.uid()) AND can_access_patient(patient_id)) WITH CHECK (is_clinical(auth.uid()) AND can_access_patient(patient_id));

DROP POLICY IF EXISTS staff_read_diagnostic_orders ON public.diagnostic_orders;
DROP POLICY IF EXISTS clinical_insert_diagnostic_orders ON public.diagnostic_orders;
DROP POLICY IF EXISTS clinical_update_diagnostic_orders ON public.diagnostic_orders;
CREATE POLICY staff_read_diagnostic_orders ON public.diagnostic_orders FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY clinical_insert_diagnostic_orders ON public.diagnostic_orders FOR INSERT TO authenticated WITH CHECK (is_clinical(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY clinical_update_diagnostic_orders ON public.diagnostic_orders FOR UPDATE TO authenticated USING (is_clinical(auth.uid()) AND can_access_patient(patient_id)) WITH CHECK (is_clinical(auth.uid()) AND can_access_patient(patient_id));

DROP POLICY IF EXISTS staff_read_patient_diagnoses ON public.patient_diagnoses;
DROP POLICY IF EXISTS clinical_insert_patient_diagnoses ON public.patient_diagnoses;
DROP POLICY IF EXISTS clinical_update_patient_diagnoses ON public.patient_diagnoses;
CREATE POLICY staff_read_patient_diagnoses ON public.patient_diagnoses FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY clinical_insert_patient_diagnoses ON public.patient_diagnoses FOR INSERT TO authenticated WITH CHECK (is_clinical(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY clinical_update_patient_diagnoses ON public.patient_diagnoses FOR UPDATE TO authenticated USING (is_clinical(auth.uid()) AND can_access_patient(patient_id)) WITH CHECK (is_clinical(auth.uid()) AND can_access_patient(patient_id));

DROP POLICY IF EXISTS staff_read_prescriptions ON public.prescriptions;
DROP POLICY IF EXISTS clinical_insert_prescriptions ON public.prescriptions;
DROP POLICY IF EXISTS clinical_update_prescriptions ON public.prescriptions;
CREATE POLICY staff_read_prescriptions ON public.prescriptions FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY clinical_insert_prescriptions ON public.prescriptions FOR INSERT TO authenticated WITH CHECK (is_clinical(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY clinical_update_prescriptions ON public.prescriptions FOR UPDATE TO authenticated USING (is_clinical(auth.uid()) AND can_access_patient(patient_id)) WITH CHECK (is_clinical(auth.uid()) AND can_access_patient(patient_id));

DROP POLICY IF EXISTS staff_read_prescription_items ON public.prescription_items;
DROP POLICY IF EXISTS clinical_insert_prescription_items ON public.prescription_items;
DROP POLICY IF EXISTS clinical_update_prescription_items ON public.prescription_items;
CREATE POLICY staff_read_prescription_items ON public.prescription_items FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_prescription(prescription_id));
CREATE POLICY clinical_insert_prescription_items ON public.prescription_items FOR INSERT TO authenticated WITH CHECK (is_clinical(auth.uid()) AND can_access_prescription(prescription_id));
CREATE POLICY clinical_update_prescription_items ON public.prescription_items FOR UPDATE TO authenticated USING (is_clinical(auth.uid()) AND can_access_prescription(prescription_id)) WITH CHECK (is_clinical(auth.uid()) AND can_access_prescription(prescription_id));

DROP POLICY IF EXISTS staff_read_optical_prescriptions ON public.optical_prescriptions;
DROP POLICY IF EXISTS clinical_insert_optical_prescriptions ON public.optical_prescriptions;
DROP POLICY IF EXISTS clinical_update_optical_prescriptions ON public.optical_prescriptions;
CREATE POLICY staff_read_optical_prescriptions ON public.optical_prescriptions FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY clinical_insert_optical_prescriptions ON public.optical_prescriptions FOR INSERT TO authenticated WITH CHECK (is_clinical(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY clinical_update_optical_prescriptions ON public.optical_prescriptions FOR UPDATE TO authenticated USING (is_clinical(auth.uid()) AND can_access_patient(patient_id)) WITH CHECK (is_clinical(auth.uid()) AND can_access_patient(patient_id));

DROP POLICY IF EXISTS staff_read_docs ON public.patient_documents;
DROP POLICY IF EXISTS staff_write_docs ON public.patient_documents;
DROP POLICY IF EXISTS staff_update_docs ON public.patient_documents;
CREATE POLICY staff_read_docs ON public.patient_documents FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY staff_write_docs ON public.patient_documents FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY staff_update_docs ON public.patient_documents FOR UPDATE TO authenticated USING (is_staff(auth.uid()) AND can_access_patient(patient_id)) WITH CHECK (is_staff(auth.uid()) AND can_access_patient(patient_id));

DROP POLICY IF EXISTS staff_read_follow_ups ON public.follow_ups;
DROP POLICY IF EXISTS staff_write_follow_ups ON public.follow_ups;
DROP POLICY IF EXISTS staff_update_follow_ups ON public.follow_ups;
CREATE POLICY staff_read_follow_ups ON public.follow_ups FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY staff_write_follow_ups ON public.follow_ups FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY staff_update_follow_ups ON public.follow_ups FOR UPDATE TO authenticated USING (is_staff(auth.uid()) AND can_access_patient(patient_id)) WITH CHECK (is_staff(auth.uid()) AND can_access_patient(patient_id));

DROP POLICY IF EXISTS finance_read_claims ON public.insurance_claims;
DROP POLICY IF EXISTS finance_insert_insurance_claims ON public.insurance_claims;
DROP POLICY IF EXISTS finance_update_insurance_claims ON public.insurance_claims;
CREATE POLICY finance_read_claims ON public.insurance_claims FOR SELECT TO authenticated USING (is_finance(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY finance_insert_insurance_claims ON public.insurance_claims FOR INSERT TO authenticated WITH CHECK (is_finance(auth.uid()) AND can_access_patient(patient_id));
CREATE POLICY finance_update_insurance_claims ON public.insurance_claims FOR UPDATE TO authenticated USING (is_finance(auth.uid()) AND can_access_patient(patient_id)) WITH CHECK (is_finance(auth.uid()) AND can_access_patient(patient_id));

-- billing
DROP POLICY IF EXISTS finance_insert_invoices ON public.invoices;
DROP POLICY IF EXISTS finance_update_invoices ON public.invoices;
DROP POLICY IF EXISTS admin_delete_invoices ON public.invoices;
CREATE POLICY finance_insert_invoices ON public.invoices FOR INSERT TO authenticated WITH CHECK (is_finance(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY finance_update_invoices ON public.invoices FOR UPDATE TO authenticated USING (is_finance(auth.uid()) AND can_access_branch(branch_id)) WITH CHECK (is_finance(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY admin_delete_invoices ON public.invoices FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id));

DROP POLICY IF EXISTS finance_read_invoice_items ON public.invoice_items;
DROP POLICY IF EXISTS finance_insert_invoice_items ON public.invoice_items;
DROP POLICY IF EXISTS finance_update_invoice_items ON public.invoice_items;
DROP POLICY IF EXISTS admin_delete_invoice_items ON public.invoice_items;
CREATE POLICY finance_read_invoice_items ON public.invoice_items FOR SELECT TO authenticated USING (is_finance(auth.uid()) AND can_access_invoice(invoice_id));
CREATE POLICY finance_insert_invoice_items ON public.invoice_items FOR INSERT TO authenticated WITH CHECK (is_finance(auth.uid()) AND can_access_invoice(invoice_id));
CREATE POLICY finance_update_invoice_items ON public.invoice_items FOR UPDATE TO authenticated USING (is_finance(auth.uid()) AND can_access_invoice(invoice_id)) WITH CHECK (is_finance(auth.uid()) AND can_access_invoice(invoice_id));
CREATE POLICY admin_delete_invoice_items ON public.invoice_items FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_invoice(invoice_id));

DROP POLICY IF EXISTS finance_read_payments ON public.payments;
DROP POLICY IF EXISTS finance_insert_payments ON public.payments;
DROP POLICY IF EXISTS finance_update_payments ON public.payments;
DROP POLICY IF EXISTS admin_delete_payments ON public.payments;
CREATE POLICY finance_read_payments ON public.payments FOR SELECT TO authenticated USING (is_finance(auth.uid()) AND can_access_invoice(invoice_id));
CREATE POLICY finance_insert_payments ON public.payments FOR INSERT TO authenticated WITH CHECK (is_finance(auth.uid()) AND can_access_invoice(invoice_id));
CREATE POLICY finance_update_payments ON public.payments FOR UPDATE TO authenticated USING (is_finance(auth.uid()) AND can_access_invoice(invoice_id)) WITH CHECK (is_finance(auth.uid()) AND can_access_invoice(invoice_id));
CREATE POLICY admin_delete_payments ON public.payments FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_invoice(invoice_id));

-- commerce / operations by branch
DROP POLICY IF EXISTS finance_write_optical_orders ON public.optical_orders;
DROP POLICY IF EXISTS finance_update_optical_orders ON public.optical_orders;
DROP POLICY IF EXISTS admin_delete_optical_orders ON public.optical_orders;
CREATE POLICY finance_write_optical_orders ON public.optical_orders FOR INSERT TO authenticated WITH CHECK (is_finance(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY finance_update_optical_orders ON public.optical_orders FOR UPDATE TO authenticated USING (is_finance(auth.uid()) AND can_access_branch(branch_id)) WITH CHECK (is_finance(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY admin_delete_optical_orders ON public.optical_orders FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id));

DROP POLICY IF EXISTS staff_read_surgeries ON public.surgeries;
DROP POLICY IF EXISTS staff_write_surgeries ON public.surgeries;
DROP POLICY IF EXISTS staff_update_surgeries ON public.surgeries;
DROP POLICY IF EXISTS admin_delete_surgeries ON public.surgeries;
CREATE POLICY staff_read_surgeries ON public.surgeries FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY staff_write_surgeries ON public.surgeries FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY staff_update_surgeries ON public.surgeries FOR UPDATE TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(branch_id)) WITH CHECK (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY admin_delete_surgeries ON public.surgeries FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id));

DROP POLICY IF EXISTS pharmacy_sales_select ON public.pharmacy_sales;
DROP POLICY IF EXISTS pharmacy_sales_insert ON public.pharmacy_sales;
DROP POLICY IF EXISTS pharmacy_sales_update ON public.pharmacy_sales;
DROP POLICY IF EXISTS pharmacy_sales_delete ON public.pharmacy_sales;
CREATE POLICY pharmacy_sales_select ON public.pharmacy_sales FOR SELECT TO authenticated USING (((is_finance(auth.uid()) OR is_clinical(auth.uid())) AND can_access_branch(branch_id)) OR owns_patient(patient_id));
CREATE POLICY pharmacy_sales_insert ON public.pharmacy_sales FOR INSERT TO authenticated WITH CHECK ((is_finance(auth.uid()) OR is_clinical(auth.uid())) AND can_access_branch(branch_id));
CREATE POLICY pharmacy_sales_update ON public.pharmacy_sales FOR UPDATE TO authenticated USING ((is_finance(auth.uid()) OR is_clinical(auth.uid())) AND can_access_branch(branch_id)) WITH CHECK ((is_finance(auth.uid()) OR is_clinical(auth.uid())) AND can_access_branch(branch_id));
CREATE POLICY pharmacy_sales_delete ON public.pharmacy_sales FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id));

DROP POLICY IF EXISTS staff_read_batches ON public.product_batches;
DROP POLICY IF EXISTS finance_write_batches ON public.product_batches;
DROP POLICY IF EXISTS finance_update_batches ON public.product_batches;
DROP POLICY IF EXISTS admin_delete_batches ON public.product_batches;
CREATE POLICY staff_read_batches ON public.product_batches FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY finance_write_batches ON public.product_batches FOR INSERT TO authenticated WITH CHECK (is_finance(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY finance_update_batches ON public.product_batches FOR UPDATE TO authenticated USING (is_finance(auth.uid()) AND can_access_branch(branch_id)) WITH CHECK (is_finance(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY admin_delete_batches ON public.product_batches FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id));

DROP POLICY IF EXISTS staff_read_stock_movements ON public.stock_movements;
DROP POLICY IF EXISTS staff_write_stock_movements ON public.stock_movements;
DROP POLICY IF EXISTS staff_update_stock_movements ON public.stock_movements;
DROP POLICY IF EXISTS admin_delete_stock_movements ON public.stock_movements;
CREATE POLICY staff_read_stock_movements ON public.stock_movements FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY staff_write_stock_movements ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY staff_update_stock_movements ON public.stock_movements FOR UPDATE TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(branch_id)) WITH CHECK (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY admin_delete_stock_movements ON public.stock_movements FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id));

DROP POLICY IF EXISTS staff_read_iol_inventory ON public.iol_inventory;
DROP POLICY IF EXISTS staff_write_iol_inventory ON public.iol_inventory;
DROP POLICY IF EXISTS staff_update_iol_inventory ON public.iol_inventory;
DROP POLICY IF EXISTS admin_delete_iol_inventory ON public.iol_inventory;
CREATE POLICY staff_read_iol_inventory ON public.iol_inventory FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY staff_write_iol_inventory ON public.iol_inventory FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY staff_update_iol_inventory ON public.iol_inventory FOR UPDATE TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(branch_id)) WITH CHECK (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY admin_delete_iol_inventory ON public.iol_inventory FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id));

DROP POLICY IF EXISTS staff_read_ot_rooms ON public.ot_rooms;
DROP POLICY IF EXISTS staff_write_ot_rooms ON public.ot_rooms;
DROP POLICY IF EXISTS staff_update_ot_rooms ON public.ot_rooms;
DROP POLICY IF EXISTS admin_delete_ot_rooms ON public.ot_rooms;
CREATE POLICY staff_read_ot_rooms ON public.ot_rooms FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY staff_write_ot_rooms ON public.ot_rooms FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY staff_update_ot_rooms ON public.ot_rooms FOR UPDATE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id)) WITH CHECK (is_admin(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY admin_delete_ot_rooms ON public.ot_rooms FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id));

DROP POLICY IF EXISTS staff_read_equipment ON public.equipment;
DROP POLICY IF EXISTS staff_write_equipment ON public.equipment;
DROP POLICY IF EXISTS staff_update_equipment ON public.equipment;
DROP POLICY IF EXISTS admin_delete_equipment ON public.equipment;
CREATE POLICY staff_read_equipment ON public.equipment FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY staff_write_equipment ON public.equipment FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY staff_update_equipment ON public.equipment FOR UPDATE TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(branch_id)) WITH CHECK (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY admin_delete_equipment ON public.equipment FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id));

DROP POLICY IF EXISTS staff_read_leads ON public.leads;
DROP POLICY IF EXISTS staff_write_leads ON public.leads;
DROP POLICY IF EXISTS staff_update_leads ON public.leads;
DROP POLICY IF EXISTS admin_delete_leads ON public.leads;
CREATE POLICY staff_read_leads ON public.leads FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY staff_write_leads ON public.leads FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY staff_update_leads ON public.leads FOR UPDATE TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(branch_id)) WITH CHECK (is_staff(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY admin_delete_leads ON public.leads FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id));

DROP POLICY IF EXISTS staff_all_lead_activities ON public.lead_activities;
CREATE POLICY staff_read_lead_activities ON public.lead_activities FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_lead(lead_id));
CREATE POLICY staff_write_lead_activities ON public.lead_activities FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()) AND can_access_lead(lead_id));
CREATE POLICY staff_update_lead_activities ON public.lead_activities FOR UPDATE TO authenticated USING (is_staff(auth.uid()) AND can_access_lead(lead_id)) WITH CHECK (is_staff(auth.uid()) AND can_access_lead(lead_id));

DROP POLICY IF EXISTS finance_read_expenses ON public.expenses;
DROP POLICY IF EXISTS finance_insert_expenses ON public.expenses;
DROP POLICY IF EXISTS finance_update_expenses ON public.expenses;
DROP POLICY IF EXISTS admin_delete_expenses ON public.expenses;
CREATE POLICY finance_read_expenses ON public.expenses FOR SELECT TO authenticated USING (is_finance(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY finance_insert_expenses ON public.expenses FOR INSERT TO authenticated WITH CHECK (is_finance(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY finance_update_expenses ON public.expenses FOR UPDATE TO authenticated USING (is_finance(auth.uid()) AND can_access_branch(branch_id)) WITH CHECK (is_finance(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY admin_delete_expenses ON public.expenses FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id));

-- procurement
DROP POLICY IF EXISTS finance_read_po ON public.purchase_orders;
DROP POLICY IF EXISTS finance_insert_purchase_orders ON public.purchase_orders;
DROP POLICY IF EXISTS finance_update_purchase_orders ON public.purchase_orders;
DROP POLICY IF EXISTS admin_delete_purchase_orders ON public.purchase_orders;
CREATE POLICY finance_read_po ON public.purchase_orders FOR SELECT TO authenticated USING (is_finance(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY finance_insert_purchase_orders ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (is_finance(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY finance_update_purchase_orders ON public.purchase_orders FOR UPDATE TO authenticated USING (is_finance(auth.uid()) AND can_access_branch(branch_id)) WITH CHECK (is_finance(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY admin_delete_purchase_orders ON public.purchase_orders FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id));

DROP POLICY IF EXISTS finance_read_po_items ON public.purchase_order_items;
DROP POLICY IF EXISTS finance_insert_purchase_order_items ON public.purchase_order_items;
DROP POLICY IF EXISTS finance_update_purchase_order_items ON public.purchase_order_items;
DROP POLICY IF EXISTS admin_delete_purchase_order_items ON public.purchase_order_items;
CREATE POLICY finance_read_po_items ON public.purchase_order_items FOR SELECT TO authenticated USING (is_finance(auth.uid()) AND can_access_po(purchase_order_id));
CREATE POLICY finance_insert_purchase_order_items ON public.purchase_order_items FOR INSERT TO authenticated WITH CHECK (is_finance(auth.uid()) AND can_access_po(purchase_order_id));
CREATE POLICY finance_update_purchase_order_items ON public.purchase_order_items FOR UPDATE TO authenticated USING (is_finance(auth.uid()) AND can_access_po(purchase_order_id)) WITH CHECK (is_finance(auth.uid()) AND can_access_po(purchase_order_id));
CREATE POLICY admin_delete_purchase_order_items ON public.purchase_order_items FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_po(purchase_order_id));

DROP POLICY IF EXISTS finance_read_grn ON public.goods_receipts;
DROP POLICY IF EXISTS finance_insert_grn ON public.goods_receipts;
DROP POLICY IF EXISTS finance_update_grn ON public.goods_receipts;
DROP POLICY IF EXISTS admin_delete_grn ON public.goods_receipts;
CREATE POLICY finance_read_grn ON public.goods_receipts FOR SELECT TO authenticated USING (is_finance(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY finance_insert_grn ON public.goods_receipts FOR INSERT TO authenticated WITH CHECK (is_finance(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY finance_update_grn ON public.goods_receipts FOR UPDATE TO authenticated USING (is_finance(auth.uid()) AND can_access_branch(branch_id)) WITH CHECK (is_finance(auth.uid()) AND can_access_branch(branch_id));
CREATE POLICY admin_delete_grn ON public.goods_receipts FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(branch_id));

DROP POLICY IF EXISTS finance_read_grn_items ON public.goods_receipt_items;
DROP POLICY IF EXISTS finance_insert_grn_items ON public.goods_receipt_items;
DROP POLICY IF EXISTS finance_update_grn_items ON public.goods_receipt_items;
DROP POLICY IF EXISTS admin_delete_grn_items ON public.goods_receipt_items;
CREATE POLICY finance_read_grn_items ON public.goods_receipt_items FOR SELECT TO authenticated USING (is_finance(auth.uid()) AND can_access_grn(goods_receipt_id));
CREATE POLICY finance_insert_grn_items ON public.goods_receipt_items FOR INSERT TO authenticated WITH CHECK (is_finance(auth.uid()) AND can_access_grn(goods_receipt_id));
CREATE POLICY finance_update_grn_items ON public.goods_receipt_items FOR UPDATE TO authenticated USING (is_finance(auth.uid()) AND can_access_grn(goods_receipt_id)) WITH CHECK (is_finance(auth.uid()) AND can_access_grn(goods_receipt_id));
CREATE POLICY admin_delete_grn_items ON public.goods_receipt_items FOR DELETE TO authenticated USING (is_admin(auth.uid()) AND can_access_grn(goods_receipt_id));

-- branches directory limited to authorised branches; only admins maintain it
DROP POLICY IF EXISTS staff_read_branches ON public.branches;
DROP POLICY IF EXISTS staff_write_branches ON public.branches;
DROP POLICY IF EXISTS staff_update_branches ON public.branches;
DROP POLICY IF EXISTS admin_delete_branches ON public.branches;
CREATE POLICY staff_read_branches ON public.branches FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND can_access_branch(id));
CREATE POLICY admin_write_branches ON public.branches FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY admin_update_branches ON public.branches FOR UPDATE TO authenticated USING (is_admin(auth.uid()) AND can_access_branch(id)) WITH CHECK (is_admin(auth.uid()) AND can_access_branch(id));
CREATE POLICY admin_delete_branches ON public.branches FOR DELETE TO authenticated USING (is_super_admin(auth.uid()));

-- settings: branch scoped rows plus global rows readable by staff, admin-managed
DROP POLICY IF EXISTS staff_read_settings ON public.settings;
DROP POLICY IF EXISTS staff_write_settings ON public.settings;
DROP POLICY IF EXISTS staff_update_settings ON public.settings;
CREATE POLICY staff_read_settings ON public.settings FOR SELECT TO authenticated USING (is_staff(auth.uid()) AND (branch_id IS NULL OR can_access_branch(branch_id)));
CREATE POLICY admin_write_settings ON public.settings FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()) AND (branch_id IS NULL OR can_access_branch(branch_id)));
CREATE POLICY admin_update_settings ON public.settings FOR UPDATE TO authenticated USING (is_admin(auth.uid()) AND (branch_id IS NULL OR can_access_branch(branch_id))) WITH CHECK (is_admin(auth.uid()) AND (branch_id IS NULL OR can_access_branch(branch_id)));

-- profiles: staff see colleagues in their branches; admins manage
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin(auth.uid()) OR (is_staff(auth.uid()) AND branch_id IS NOT NULL AND can_access_branch(branch_id)));