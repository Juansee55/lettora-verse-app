-- Ensure the invisibility flag can only be enabled on an actual administrator profile.
CREATE OR REPLACE FUNCTION public.protect_admin_identity_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.admin_hide_identity IS DISTINCT FROM OLD.admin_hide_identity THEN
    IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only administrators may change administrator visibility';
    END IF;

    IF COALESCE(NEW.admin_hide_identity, false)
       AND NOT public.has_role(NEW.id, 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only administrator profiles may be hidden from public listings';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
