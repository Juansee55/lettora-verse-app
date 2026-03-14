
-- Add book configuration columns
ALTER TABLE public.books 
  ADD COLUMN IF NOT EXISTS age_rating text DEFAULT 'all' CHECK (age_rating IN ('all', '13+', '16+', '18+')),
  ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'not_requested'));
