
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bot_type text;

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  section text NOT NULL,
  event_type text NOT NULL DEFAULT 'view',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT INSERT ON public.analytics_events TO anon;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert own analytics" ON public.analytics_events;
CREATE POLICY "insert own analytics" ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "anon insert analytics" ON public.analytics_events;
CREATE POLICY "anon insert analytics" ON public.analytics_events
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "admins read analytics" ON public.analytics_events;
CREATE POLICY "admins read analytics" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_analytics_created ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_section ON public.analytics_events (section);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON public.analytics_events (user_id);

CREATE TABLE IF NOT EXISTS public.banned_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text UNIQUE NOT NULL,
  severity int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banned_words TO authenticated;
GRANT ALL ON public.banned_words TO service_role;
ALTER TABLE public.banned_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read banned" ON public.banned_words;
CREATE POLICY "authenticated read banned" ON public.banned_words
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admins manage banned" ON public.banned_words;
CREATE POLICY "admins manage banned" ON public.banned_words
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.banned_words (word) VALUES
  ('idiota'),('imbécil'),('imbecil'),('estúpido'),('estupido'),
  ('gilipollas'),('pendejo'),('mierda'),('puta'),('cabrón'),('cabron'),
  ('maricón'),('maricon'),('spam'),('bit.ly/scam'),('phishing'),
  ('nazi'),('hitler'),('kys')
ON CONFLICT (word) DO NOTHING;

CREATE OR REPLACE FUNCTION public.auto_delete_reported_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_count int;
BEGIN
  SELECT COUNT(*) INTO report_count
  FROM public.content_reports
  WHERE content_type = NEW.content_type
    AND content_id = NEW.content_id
    AND status = 'pending';

  IF report_count >= 3 THEN
    IF NEW.content_type = 'microstory' THEN
      DELETE FROM public.microstories WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'comment' THEN
      DELETE FROM public.comments WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'literary_post' THEN
      DELETE FROM public.literary_posts WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'post' THEN
      DELETE FROM public.posts WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'book' THEN
      UPDATE public.books SET status = 'archived' WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'chapter' THEN
      UPDATE public.chapters SET is_published = false WHERE id = NEW.content_id;
    END IF;

    UPDATE public.content_reports
      SET status = 'auto_resolved',
          resolved_at = now(),
          admin_notes = COALESCE(admin_notes,'') || ' [BotAdmin: 3+ reportes → auto-eliminado]'
      WHERE content_type = NEW.content_type
        AND content_id = NEW.content_id
        AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_delete_reported ON public.content_reports;
CREATE TRIGGER trg_auto_delete_reported
AFTER INSERT ON public.content_reports
FOR EACH ROW EXECUTE FUNCTION public.auto_delete_reported_content();
