-- Every authenticated account starts as a regular user.
-- Author is a progression rank, not an authentication role.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::public.app_role
FROM auth.users AS u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_roles AS ur
  WHERE ur.user_id = u.id
);

-- Remove stale level values that could display a new user as "Autor".
UPDATE public.user_levels
SET level = public.calculate_level(GREATEST(COALESCE(xp, 0), 0)),
    updated_at = now()
WHERE level IS DISTINCT FROM public.calculate_level(GREATEST(COALESCE(xp, 0), 0));
