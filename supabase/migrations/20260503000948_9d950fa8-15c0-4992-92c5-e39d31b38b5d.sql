
-- 1. PROFILES privacy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Public or accessible profiles viewable"
ON public.profiles FOR SELECT
USING (
  COALESCE(is_private, false) = false
  OR auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.followers
    WHERE follower_id = auth.uid() AND following_id = profiles.id
  )
);

-- 2. NOTIFICATIONS lockdown
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Triggers run as SECURITY DEFINER and bypass RLS, so no permissive client policy is needed.
-- Provide a controlled RPC for admin/moderation flows.
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  -- Only admins or moderators can send arbitrary notifications to others
  IF p_user_id <> auth.uid()
     AND NOT (public.has_role(auth.uid(), 'admin'::app_role)
              OR public.has_role(auth.uid(), 'moderator'::app_role)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (p_user_id, p_type, p_title, p_message, p_link)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, text) TO authenticated;

-- 3. PREMIUM SUBSCRIPTIONS — restrict to owner; add public flag on profile for badge
DROP POLICY IF EXISTS "Premium status viewable by everyone" ON public.premium_subscriptions;

CREATE POLICY "Users view own subscription"
ON public.premium_subscriptions FOR SELECT
USING (auth.uid() = user_id);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.sync_profile_is_premium()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := COALESCE(NEW.user_id, OLD.user_id);
  _active boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.premium_subscriptions
    WHERE user_id = _user
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO _active;
  UPDATE public.profiles SET is_premium = _active WHERE id = _user;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_is_premium ON public.premium_subscriptions;
CREATE TRIGGER trg_sync_profile_is_premium
AFTER INSERT OR UPDATE OR DELETE ON public.premium_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_is_premium();

-- Backfill
UPDATE public.profiles p SET is_premium = EXISTS (
  SELECT 1 FROM public.premium_subscriptions s
  WHERE s.user_id = p.id AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
);

-- 4. USER_LEVELS — restrict mutations to owner; triggers (SECURITY DEFINER) keep working
DROP POLICY IF EXISTS "System updates levels" ON public.user_levels;
DROP POLICY IF EXISTS "System manages levels" ON public.user_levels;

CREATE POLICY "Users insert own level row"
ON public.user_levels FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own level row"
ON public.user_levels FOR UPDATE
USING (auth.uid() = user_id);

-- 5. CHAT-MEDIA bucket -> private, owner-only direct read (signed URLs handle sharing)
UPDATE storage.buckets SET public = false WHERE id = 'chat-media';

DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;

CREATE POLICY "Owners read own chat media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
