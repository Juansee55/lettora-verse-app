-- Biblioteca libre: procedencia legal, revisión administrativa y publicación mensual segura.
-- La automatización solo publica filas ya aprobadas; nunca selecciona obras ni evalúa copyright por sí sola.

ALTER TABLE public.free_books
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS license_note text,
  ADD COLUMN IF NOT EXISTS rights_jurisdiction text,
  ADD COLUMN IF NOT EXISTS rights_verified_at date,
  ADD COLUMN IF NOT EXISTS content_format text NOT NULL DEFAULT 'plain_text',
  ADD COLUMN IF NOT EXISTS added_month date,
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.free_books
SET added_month = date_trunc('month', COALESCE(added_week, created_at::date))::date
WHERE added_month IS NULL;

UPDATE public.free_books
SET publish_at = created_at
WHERE publish_at IS NULL;

ALTER TABLE public.free_books
  DROP CONSTRAINT IF EXISTS free_books_content_format_check,
  ADD CONSTRAINT free_books_content_format_check CHECK (content_format IN ('plain_text', 'html', 'markdown')),
  DROP CONSTRAINT IF EXISTS free_books_approval_status_check,
  ADD CONSTRAINT free_books_approval_status_check CHECK (approval_status IN ('draft', 'approved', 'published', 'rejected'));

CREATE INDEX IF NOT EXISTS free_books_public_month_idx
  ON public.free_books (added_month DESC, publish_at DESC)
  WHERE approval_status IN ('approved', 'published');

DROP POLICY IF EXISTS "Free books are viewable by everyone" ON public.free_books;
CREATE POLICY "Approved free books are viewable by everyone"
  ON public.free_books FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      approval_status IN ('approved', 'published')
      AND COALESCE(publish_at, now()) <= now()
    )
  );

CREATE TABLE IF NOT EXISTS public.free_book_ingestion_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
  description text,
  cover_url text,
  content_url text,
  content text,
  language text NOT NULL DEFAULT 'es',
  genre text,
  source text NOT NULL DEFAULT 'gutenberg',
  external_id text,
  source_url text,
  license_note text,
  rights_jurisdiction text,
  rights_verified_at date,
  content_format text NOT NULL DEFAULT 'plain_text',
  scheduled_month date NOT NULL,
  is_featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  review_notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  published_book_id uuid REFERENCES public.free_books(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT free_book_queue_content_format_check CHECK (content_format IN ('plain_text', 'html', 'markdown')),
  CONSTRAINT free_book_queue_status_check CHECK (status IN ('draft', 'approved', 'published', 'rejected')),
  CONSTRAINT free_book_queue_scheduled_month_check CHECK (scheduled_month = date_trunc('month', scheduled_month)::date)
);

CREATE UNIQUE INDEX IF NOT EXISTS free_book_queue_source_external_idx
  ON public.free_book_ingestion_queue(source, external_id)
  WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS free_book_queue_due_idx
  ON public.free_book_ingestion_queue(status, scheduled_month);

ALTER TABLE public.free_book_ingestion_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.free_book_ingestion_queue FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.free_book_ingestion_queue TO authenticated;
GRANT ALL ON TABLE public.free_book_ingestion_queue TO service_role;

DROP POLICY IF EXISTS "Admins manage free book queue" ON public.free_book_ingestion_queue;
CREATE POLICY "Admins manage free book queue"
  ON public.free_book_ingestion_queue FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.publish_due_free_books(p_limit integer DEFAULT 12)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue record;
  v_book_id uuid;
  v_published integer := 0;
  v_skipped integer := 0;
  v_month date := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 50';
  END IF;

  FOR v_queue IN
    SELECT *
    FROM public.free_book_ingestion_queue
    WHERE status = 'approved'
      AND scheduled_month <= v_month
    ORDER BY scheduled_month, created_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    IF v_queue.source_url IS NULL
       OR v_queue.license_note IS NULL
       OR v_queue.rights_jurisdiction IS NULL
       OR v_queue.rights_verified_at IS NULL
       OR (v_queue.content IS NULL AND v_queue.content_url IS NULL) THEN
      UPDATE public.free_book_ingestion_queue
      SET status = 'rejected',
          review_notes = COALESCE(review_notes || E'\n', '') || 'Faltan procedencia, verificación o contenido legible.',
          updated_at = now()
      WHERE id = v_queue.id;
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.free_books (
      title, author, description, cover_url, content, content_url, language, source,
      external_id, genre, added_week, added_month, is_featured, source_url,
      license_note, rights_jurisdiction, rights_verified_at, content_format,
      publish_at, approval_status, approved_by
    ) VALUES (
      v_queue.title, v_queue.author, v_queue.description, v_queue.cover_url, v_queue.content,
      v_queue.content_url, v_queue.language, v_queue.source, v_queue.external_id,
      v_queue.genre, v_queue.scheduled_month, v_queue.scheduled_month, v_queue.is_featured,
      v_queue.source_url, v_queue.license_note, v_queue.rights_jurisdiction,
      v_queue.rights_verified_at, v_queue.content_format, now(), 'published', v_queue.reviewed_by
    )
    ON CONFLICT (source, external_id) WHERE external_id IS NOT NULL
    DO UPDATE SET
      title = EXCLUDED.title,
      author = EXCLUDED.author,
      description = EXCLUDED.description,
      cover_url = EXCLUDED.cover_url,
      content_url = EXCLUDED.content_url,
      language = EXCLUDED.language,
      genre = EXCLUDED.genre,
      added_week = EXCLUDED.added_week,
      added_month = EXCLUDED.added_month,
      is_featured = EXCLUDED.is_featured,
      source_url = EXCLUDED.source_url,
      license_note = EXCLUDED.license_note,
      rights_jurisdiction = EXCLUDED.rights_jurisdiction,
      rights_verified_at = EXCLUDED.rights_verified_at,
      content_format = EXCLUDED.content_format,
      publish_at = EXCLUDED.publish_at,
      approval_status = 'published',
      approved_by = EXCLUDED.approved_by,
      updated_at = now()
    RETURNING id INTO v_book_id;

    UPDATE public.free_book_ingestion_queue
    SET status = 'published', published_book_id = v_book_id, updated_at = now()
    WHERE id = v_queue.id;

    INSERT INTO public.notifications (user_id, type, title, message, link)
    SELECT p.id,
           'free_book_drop',
           'Nueva lectura gratuita',
           'Ya puedes leer «' || v_queue.title || '» en la Biblioteca libre.',
           '/free-books/' || v_book_id
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = p.id
        AND n.type = 'free_book_drop'
        AND n.link = '/free-books/' || v_book_id
    );

    v_published := v_published + 1;
  END LOOP;

  RETURN jsonb_build_object('published', v_published, 'skipped', v_skipped, 'month', v_month);
END;
$$;

REVOKE ALL ON FUNCTION public.publish_due_free_books(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_due_free_books(integer) TO service_role;

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'lettora-monthly-free-books' LIMIT 1;
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN
  NULL;
END;
$$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'lettora-monthly-free-books',
    '30 5 1 * *',
    $job$SELECT public.publish_due_free_books(12);$job$
  );
EXCEPTION WHEN undefined_table OR undefined_function THEN
  NULL;
END;
$$;
