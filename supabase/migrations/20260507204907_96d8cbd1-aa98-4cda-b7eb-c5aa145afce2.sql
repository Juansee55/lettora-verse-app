
-- App versions
CREATE TABLE public.app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  release_notes text,
  is_current boolean NOT NULL DEFAULT false,
  released_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read versions" ON public.app_versions FOR SELECT USING (true);
CREATE POLICY "Admins manage versions insert" ON public.app_versions FOR INSERT WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage versions update" ON public.app_versions FOR UPDATE USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage versions delete" ON public.app_versions FOR DELETE USING (has_role(auth.uid(),'admin'));

-- Ensure single current
CREATE OR REPLACE FUNCTION public.ensure_single_current_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.is_current THEN
    UPDATE public.app_versions SET is_current = false WHERE id <> NEW.id AND is_current = true;
  END IF;
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_single_current_version
BEFORE INSERT OR UPDATE ON public.app_versions
FOR EACH ROW EXECUTE FUNCTION public.ensure_single_current_version();

INSERT INTO public.app_versions (version, release_notes, is_current)
VALUES ('1.9.4', 'Mejoras de lectura: marcadores, notas, resaltado y lectura en voz alta. Para escritores: borradores y publicación programada.', true);

-- Chapter bookmarks
CREATE TABLE public.chapter_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chapter_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own bookmarks select" ON public.chapter_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own bookmarks insert" ON public.chapter_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own bookmarks delete" ON public.chapter_bookmarks FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_chapter_bookmarks_user ON public.chapter_bookmarks(user_id, chapter_id);

-- Reader notes
CREATE TABLE public.reader_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  paragraph_index integer NOT NULL DEFAULT 0,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reader_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notes select" ON public.reader_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own notes insert" ON public.reader_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own notes update" ON public.reader_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own notes delete" ON public.reader_notes FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_reader_notes_user ON public.reader_notes(user_id, chapter_id);

-- Reader highlights
CREATE TABLE public.reader_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  paragraph_index integer NOT NULL DEFAULT 0,
  snippet text NOT NULL,
  color text NOT NULL DEFAULT 'yellow',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reader_highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own highlights select" ON public.reader_highlights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own highlights insert" ON public.reader_highlights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own highlights delete" ON public.reader_highlights FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_reader_highlights_user ON public.reader_highlights(user_id, chapter_id);

-- Writer features on chapters
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS publish_at timestamptz;
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS draft_content text;
