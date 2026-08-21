INSERT INTO public.user_branches (user_id, branch_id)
SELECT 'd1ac723d-eca8-458d-ad38-21c0fd7c7c74'::uuid, b.id
FROM public.branches b
WHERE b.is_active
  AND NOT EXISTS (SELECT 1 FROM public.user_branches ub WHERE ub.user_id = 'd1ac723d-eca8-458d-ad38-21c0fd7c7c74'::uuid)
ORDER BY b.created_at
LIMIT 1;