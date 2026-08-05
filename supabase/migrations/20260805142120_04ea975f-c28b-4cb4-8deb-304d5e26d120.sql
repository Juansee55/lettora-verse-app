
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS privacy text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS music jsonb,
  ADD COLUMN IF NOT EXISTS filter text,
  ADD COLUMN IF NOT EXISTS overlays jsonb,
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replies_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_ms integer NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS hidden_from uuid[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.best_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id)
);
GRANT SELECT, INSERT, DELETE ON public.best_friends TO authenticated;
GRANT ALL ON public.best_friends TO service_role;
ALTER TABLE public.best_friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bf_select" ON public.best_friends FOR SELECT TO authenticated USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY "bf_insert" ON public.best_friends FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "bf_delete" ON public.best_friends FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.story_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.story_likes TO authenticated;
GRANT ALL ON public.story_likes TO service_role;
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sl_select" ON public.story_likes FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid()));
CREATE POLICY "sl_insert" ON public.story_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "sl_delete" ON public.story_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.story_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.story_replies TO authenticated;
GRANT ALL ON public.story_replies TO service_role;
ALTER TABLE public.story_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_select" ON public.story_replies FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid()));
CREATE POLICY "sr_insert" ON public.story_replies FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "sr_delete" ON public.story_replies FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.story_mutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  muted_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, muted_user_id)
);
GRANT SELECT, INSERT, DELETE ON public.story_mutes TO authenticated;
GRANT ALL ON public.story_mutes TO service_role;
ALTER TABLE public.story_mutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sm_all" ON public.story_mutes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Active stories viewable by authenticated" ON public.stories;
CREATE POLICY "Glimpse visibility rules" ON public.stories FOR SELECT TO authenticated
USING (
  expires_at > now()
  AND NOT (auth.uid() = ANY (hidden_from))
  AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE (b.blocker_id = stories.user_id AND b.blocked_id = auth.uid()) OR (b.blocker_id = auth.uid() AND b.blocked_id = stories.user_id))
  AND (
    stories.user_id = auth.uid()
    OR (privacy = 'public')
    OR (privacy = 'followers' AND EXISTS (SELECT 1 FROM public.followers f WHERE f.following_id = stories.user_id AND f.follower_id = auth.uid()))
    OR (privacy = 'best_friends' AND EXISTS (SELECT 1 FROM public.best_friends bf WHERE bf.user_id = stories.user_id AND bf.friend_id = auth.uid()))
  )
);

CREATE POLICY "Users update own stories" ON public.stories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.glimpse_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; actor_name text;
BEGIN
  IF TG_TABLE_NAME = 'story_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE stories SET likes_count = likes_count + 1 WHERE id = NEW.story_id RETURNING user_id INTO owner_id;
      IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
        SELECT display_name INTO actor_name FROM profiles WHERE id = NEW.user_id;
        PERFORM send_notification(owner_id, 'glimpse_like', 'Nuevo me gusta', COALESCE(actor_name,'Alguien') || ' le dio me gusta a tu Glimpse', '/microstories');
      END IF;
      RETURN NEW;
    ELSE
      UPDATE stories SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.story_id;
      RETURN OLD;
    END IF;
  ELSIF TG_TABLE_NAME = 'story_replies' THEN
    UPDATE stories SET replies_count = replies_count + 1 WHERE id = NEW.story_id RETURNING user_id INTO owner_id;
    IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
      SELECT display_name INTO actor_name FROM profiles WHERE id = NEW.user_id;
      PERFORM send_notification(owner_id, 'glimpse_reply', 'Respuesta a tu Glimpse', COALESCE(actor_name,'Alguien') || ': ' || left(NEW.content, 80), '/microstories');
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_glimpse_like ON public.story_likes;
CREATE TRIGGER trg_glimpse_like AFTER INSERT OR DELETE ON public.story_likes FOR EACH ROW EXECUTE FUNCTION public.glimpse_counts();
DROP TRIGGER IF EXISTS trg_glimpse_reply ON public.story_replies;
CREATE TRIGGER trg_glimpse_reply AFTER INSERT ON public.story_replies FOR EACH ROW EXECUTE FUNCTION public.glimpse_counts();

CREATE OR REPLACE FUNCTION public.notify_best_friends_glimpse()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; author_name text;
BEGIN
  SELECT display_name INTO author_name FROM profiles WHERE id = NEW.user_id;
  FOR r IN SELECT friend_id FROM best_friends WHERE user_id = NEW.user_id LOOP
    PERFORM send_notification(r.friend_id, 'glimpse_new', 'Nuevo Glimpse', COALESCE(author_name,'Alguien') || ' publicó un nuevo Glimpse', '/microstories');
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_glimpse_new ON public.stories;
CREATE TRIGGER trg_glimpse_new AFTER INSERT ON public.stories FOR EACH ROW EXECUTE FUNCTION public.notify_best_friends_glimpse();

CREATE OR REPLACE FUNCTION public.delete_expired_glimpses()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.stories WHERE expires_at < now();
$$;
GRANT EXECUTE ON FUNCTION public.delete_expired_glimpses() TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_glimpse_share(p_story_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.stories SET shares_count = shares_count + 1 WHERE id = p_story_id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_glimpse_share(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_stories_expires ON public.stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_user ON public.stories(user_id);
