-- Compatibilidad para sincronizar progreso de lectura en una base que ya contiene
-- public.reading_progress desde la migración principal de Lettora.
ALTER TABLE public.reading_progress
  ADD COLUMN IF NOT EXISTS chapter_number INTEGER,
  ADD COLUMN IF NOT EXISTS scroll_percentage DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE public.reading_progress
SET chapter_number = COALESCE(chapter_number, current_chapter, 1),
    scroll_percentage = COALESCE(scroll_percentage, progress_percent, 0),
    last_read_at = COALESCE(last_read_at, started_at, now()),
    created_at = COALESCE(created_at, started_at, now()),
    updated_at = COALESCE(updated_at, started_at, now())
WHERE chapter_number IS NULL
   OR scroll_percentage IS NULL
   OR last_read_at IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL;

ALTER TABLE public.reading_progress
  ALTER COLUMN chapter_number SET DEFAULT 1,
  ALTER COLUMN chapter_number SET NOT NULL,
  ALTER COLUMN scroll_percentage SET DEFAULT 0,
  ALTER COLUMN scroll_percentage SET NOT NULL,
  ALTER COLUMN last_read_at SET DEFAULT now(),
  ALTER COLUMN last_read_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON public.reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_book_id ON public.reading_progress(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_updated_at ON public.reading_progress(updated_at DESC);

CREATE OR REPLACE FUNCTION public.update_reading_progress_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reading_progress_updated_at_trigger ON public.reading_progress;
CREATE TRIGGER reading_progress_updated_at_trigger
BEFORE UPDATE ON public.reading_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_reading_progress_timestamp();
