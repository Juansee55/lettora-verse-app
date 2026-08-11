-- Keep profile names populated for password, magic-link and OAuth signups.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email_name TEXT;
  v_username TEXT;
  v_display_name TEXT;
  v_avatar_url TEXT;
  v_base_username TEXT;
  v_suffix TEXT;
BEGIN
  v_email_name := NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '');

  v_base_username := lower(regexp_replace(
    COALESCE(
      NEW.raw_user_meta_data ->> 'username',
      NEW.raw_user_meta_data ->> 'preferred_username',
      v_email_name,
      'user'
    ),
    '[^a-z0-9_.]', '', 'g'
  ));
  v_base_username := left(COALESCE(NULLIF(v_base_username, ''), 'user'), 20);
  v_username := v_base_username;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_suffix := left(replace(NEW.id::text, '-', ''), 6);
    v_username := left(v_base_username, 13) || '_' || v_suffix;
  END IF;

  v_display_name := NULLIF(trim(COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'user_name',
    NEW.raw_user_meta_data ->> 'username',
    v_email_name,
    v_username
  )), '');

  v_avatar_url := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'picture', '')
  );

  INSERT INTO public.profiles AS profile (id, username, display_name, avatar_url)
  VALUES (NEW.id, v_username, v_display_name, v_avatar_url)
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(profile.username, EXCLUDED.username),
    display_name = COALESCE(NULLIF(profile.display_name, ''), EXCLUDED.display_name),
    avatar_url = COALESCE(profile.avatar_url, EXCLUDED.avatar_url);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Repair accounts created before the profile trigger included OAuth names.
UPDATE public.profiles AS p
SET
  display_name = COALESCE(
    NULLIF(p.display_name, ''),
    NULLIF(u.raw_user_meta_data ->> 'display_name', ''),
    NULLIF(u.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(u.raw_user_meta_data ->> 'name', ''),
    NULLIF(p.username, ''),
    NULLIF(split_part(u.email, '@', 1), '')
  ),
  avatar_url = COALESCE(
    p.avatar_url,
    NULLIF(u.raw_user_meta_data ->> 'avatar_url', ''),
    NULLIF(u.raw_user_meta_data ->> 'picture', '')
  )
FROM auth.users AS u
WHERE p.id = u.id
  AND (p.display_name IS NULL OR p.display_name = '' OR p.avatar_url IS NULL);
