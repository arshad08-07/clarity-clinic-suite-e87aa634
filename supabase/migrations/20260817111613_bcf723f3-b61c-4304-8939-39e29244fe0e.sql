CREATE POLICY "Staff read diagnostic reports" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'diagnostic-reports' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff upload diagnostic reports" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'diagnostic-reports' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff update diagnostic reports" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'diagnostic-reports' AND public.is_staff(auth.uid()));
CREATE POLICY "Admins delete diagnostic reports" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'diagnostic-reports' AND public.is_admin(auth.uid()));