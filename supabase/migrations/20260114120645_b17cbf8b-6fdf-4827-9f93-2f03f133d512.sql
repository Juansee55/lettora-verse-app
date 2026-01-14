-- Create book promotions table
CREATE TABLE public.book_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_hours INTEGER NOT NULL DEFAULT 24,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.book_promotions ENABLE ROW LEVEL SECURITY;

-- Promotions are viewable by everyone
CREATE POLICY "Promotions are viewable by everyone"
ON public.book_promotions
FOR SELECT
USING (true);

-- Users can create promotions for their own books
CREATE POLICY "Users can create their own promotions"
ON public.book_promotions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM books WHERE books.id = book_promotions.book_id AND books.author_id = auth.uid()
  )
);

-- Users can delete their own promotions
CREATE POLICY "Users can delete their own promotions"
ON public.book_promotions
FOR DELETE
USING (auth.uid() = user_id);

-- Regular index without predicate (immutable issue fix)
CREATE INDEX idx_book_promotions_ends_at ON public.book_promotions (ends_at);