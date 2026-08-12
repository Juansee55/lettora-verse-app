-- Persist native Android FCM tokens separately from browser Web Push subscriptions.
CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios')),
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own device push tokens" ON public.device_push_tokens;
CREATE POLICY "Users view own device push tokens"
  ON public.device_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users register own device push tokens" ON public.device_push_tokens;
CREATE POLICY "Users register own device push tokens"
  ON public.device_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users refresh own device push tokens" ON public.device_push_tokens;
CREATE POLICY "Users refresh own device push tokens"
  ON public.device_push_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users remove own device push tokens" ON public.device_push_tokens;
CREATE POLICY "Users remove own device push tokens"
  ON public.device_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user_id
  ON public.device_push_tokens(user_id);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id, read_at, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'device_push_tokens'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.device_push_tokens;
  END IF;
END $$;

-- Notify an author's followers when a book becomes visible to readers.
CREATE OR REPLACE FUNCTION public.notify_book_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _author_name TEXT;
  _follower RECORD;
BEGIN
  IF NEW.status NOT IN ('published', 'completed')
     OR COALESCE(OLD.status, 'draft') IN ('published', 'completed') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(display_name, ''), NULLIF(username, ''), 'Un autor')
    INTO _author_name
  FROM public.profiles
  WHERE id = NEW.author_id;

  FOR _follower IN
    SELECT following_id AS user_id
    FROM public.followers
    WHERE follower_id = NEW.author_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link, data)
    VALUES (
      _follower.user_id,
      'new_book',
      'Nuevo libro publicado',
      _author_name || ' publicó «' || COALESCE(NEW.title, 'un nuevo libro') || '»',
      '/book/' || NEW.id,
      jsonb_build_object('bookId', NEW.id, 'authorId', NEW.author_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_book_published_notify ON public.books;
CREATE TRIGGER on_book_published_notify
  AFTER UPDATE OF status ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_book_published();

-- Notify every active account when an administrator publishes an announcement/news item.
CREATE OR REPLACE FUNCTION public.notify_admin_news()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user RECORD;
BEGIN
  IF COALESCE(NEW.is_active, true) = false THEN
    RETURN NEW;
  END IF;

  FOR _user IN SELECT id AS user_id FROM public.profiles LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link, data)
    VALUES (
      _user.user_id,
      'admin_announcement',
      COALESCE(NEW.title, 'Anuncio de Lettora'),
      COALESCE(NEW.description, 'Hay una nueva comunicación de los administradores.'),
      '/news',
      jsonb_build_object('newsId', NEW.id, 'newsType', NEW.news_type)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_admin_news_notify ON public.news;
CREATE TRIGGER on_admin_news_notify
  AFTER INSERT ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_news();

-- Keep the notifications row as the source of truth. Delivery to Web Push/FCM
-- is handled by the deployed send-push Edge Function/database webhook.
COMMENT ON TABLE public.device_push_tokens IS 'FCM/APNs tokens registered by native Capacitor devices';
