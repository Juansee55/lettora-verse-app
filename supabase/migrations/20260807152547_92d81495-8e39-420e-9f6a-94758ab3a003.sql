DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public' LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants g WHERE g.table_schema='public' AND g.table_name=t.relname AND g.grantee='authenticated' AND g.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')) THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t.relname);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants g WHERE g.table_schema='public' AND g.table_name=t.relname AND g.grantee='service_role' AND g.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')) THEN
      EXECUTE format('GRANT ALL ON public.%I TO service_role', t.relname);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','books','chapters','free_books','free_book_ratings','news','announcements','app_versions','social_links','shop_items','hashtags','content_hashtags','microstories','posts','literary_posts','book_reviews','comments','universes','webcomics','webcomic_episodes','author_blogs','proposals','user_levels','user_badges','user_equipped_badges','followers','user_roles','collectible_cards','weapons','glossary_entries','likes','post_reactions','chapter_likes'] LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public' AND c.relname=t) THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  IF NEW.raw_user_meta_data ->> 'birth_date' IS NOT NULL THEN
    UPDATE public.profiles
    SET birth_date = (NEW.raw_user_meta_data ->> 'birth_date')::date
    WHERE id = NEW.id;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'user'::app_role FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id)
ON CONFLICT DO NOTHING;