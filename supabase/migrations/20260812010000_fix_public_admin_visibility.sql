-- Public, privacy-aware directory for administrators and moderators.
-- SECURITY DEFINER is required because user_roles is intentionally private.
CREATE OR REPLACE FUNCTION public.get_public_admins()
RETURNS TABLE (
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  is_verified boolean,
  admin_title text,
  admin_bio text,
  role_since date,
  is_active boolean,
  left_at date,
  birth_date date,
  role public.app_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.is_verified,
    ur.admin_title,
    ur.admin_bio,
    ur.role_since,
    ur.is_active,
    ur.left_at,
    CASE
      WHEN COALESCE(p.admin_hide_identity, false)
        AND auth.uid() <> p.id
        AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
      THEN NULL::date
      ELSE ur.birth_date
    END AS birth_date,
    ur.role
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role IN ('admin'::public.app_role, 'moderator'::public.app_role)
    AND (
      COALESCE(p.admin_hide_identity, false) = false
      OR auth.uid() = p.id
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  ORDER BY
    ur.is_active DESC,
    (ur.role = 'admin'::public.app_role) DESC,
    COALESCE(p.display_name, p.username, '') ASC;
$$;

REVOKE ALL ON FUNCTION public.get_public_admins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_admins() TO anon, authenticated;
