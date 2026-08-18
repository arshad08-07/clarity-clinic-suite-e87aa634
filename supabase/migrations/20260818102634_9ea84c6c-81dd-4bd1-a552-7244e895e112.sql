REVOKE ALL ON FUNCTION public.lead_patient_matches(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.can_convert_leads(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.crm_funnel(date, date) FROM anon;
REVOKE ALL ON FUNCTION public.appointment_subject_guard() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lead_patient_matches(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_convert_leads(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_funnel(date, date) TO authenticated;