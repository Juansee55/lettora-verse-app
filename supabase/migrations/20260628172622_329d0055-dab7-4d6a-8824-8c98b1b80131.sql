
-- Remove insecure permissive chat-media SELECT policy (participant-scoped policy remains)
DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;

-- ──────────────────────────────────────────────────────────────
-- FREE BOOKS (public-domain catalog, weekly curation)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.free_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  content TEXT,                       -- full text (plain or HTML)
  content_url TEXT,                   -- optional remote source URL
  language TEXT DEFAULT 'es',
  source TEXT DEFAULT 'gutenberg',    -- gutenberg | wikisource | custom
  external_id TEXT,                   -- e.g. Gutenberg book id
  genre TEXT,
  added_week DATE DEFAULT date_trunc('week', CURRENT_DATE)::date,
  is_featured BOOLEAN DEFAULT false,
  rating_avg NUMERIC(3,2) DEFAULT 0,
  ratings_count INTEGER DEFAULT 0,
  reads_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS free_books_source_external_idx
  ON public.free_books(source, external_id) WHERE external_id IS NOT NULL;

GRANT SELECT ON public.free_books TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.free_books TO authenticated;
GRANT ALL ON public.free_books TO service_role;

ALTER TABLE public.free_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Free books are viewable by everyone"
  ON public.free_books FOR SELECT USING (true);
CREATE POLICY "Admins manage free books - insert"
  ON public.free_books FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage free books - update"
  ON public.free_books FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage free books - delete"
  ON public.free_books FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ──────────────────────────────────────────────────────────────
-- FREE BOOK RATINGS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.free_book_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.free_books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, user_id)
);

GRANT SELECT ON public.free_book_ratings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.free_book_ratings TO authenticated;
GRANT ALL ON public.free_book_ratings TO service_role;

ALTER TABLE public.free_book_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are viewable by everyone"
  ON public.free_book_ratings FOR SELECT USING (true);
CREATE POLICY "Users insert own rating"
  ON public.free_book_ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own rating"
  ON public.free_book_ratings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own rating"
  ON public.free_book_ratings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Aggregate trigger to keep rating_avg / ratings_count fresh
CREATE OR REPLACE FUNCTION public.refresh_free_book_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_book UUID := COALESCE(NEW.book_id, OLD.book_id);
BEGIN
  UPDATE public.free_books fb
  SET rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.free_book_ratings WHERE book_id = v_book), 0),
      ratings_count = (SELECT COUNT(*) FROM public.free_book_ratings WHERE book_id = v_book),
      updated_at = now()
  WHERE fb.id = v_book;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_refresh_free_book_rating ON public.free_book_ratings;
CREATE TRIGGER trg_refresh_free_book_rating
AFTER INSERT OR UPDATE OR DELETE ON public.free_book_ratings
FOR EACH ROW EXECUTE FUNCTION public.refresh_free_book_rating();
