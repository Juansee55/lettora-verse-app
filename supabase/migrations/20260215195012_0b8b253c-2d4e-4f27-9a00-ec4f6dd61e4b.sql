
-- Make user roles publicly visible (role + admin_title only)
CREATE POLICY "Everyone can view roles"
ON public.user_roles
FOR SELECT
USING (true);

-- Trigger to increment reads_count on first reading_progress insert
CREATE OR REPLACE FUNCTION public.increment_reads_on_first_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only increment on INSERT (first time reading)
  UPDATE public.books
  SET reads_count = COALESCE(reads_count, 0) + 1
  WHERE id = NEW.book_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER increment_book_reads_on_progress
AFTER INSERT ON public.reading_progress
FOR EACH ROW
EXECUTE FUNCTION public.increment_reads_on_first_progress();
