-- Create saved_books table for users to save/bookmark books
CREATE TABLE public.saved_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- Enable RLS
ALTER TABLE public.saved_books ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own saved books"
ON public.saved_books
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save books"
ON public.saved_books
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove saved books"
ON public.saved_books
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_saved_books_user_id ON public.saved_books(user_id);
CREATE INDEX idx_saved_books_book_id ON public.saved_books(book_id);