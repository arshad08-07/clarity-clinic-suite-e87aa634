DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM public.profiles WHERE full_name LIKE 'PROBE %');
DELETE FROM public.profiles WHERE full_name LIKE 'PROBE %';