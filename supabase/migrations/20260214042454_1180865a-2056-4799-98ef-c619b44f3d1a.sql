
-- Premium subscriptions table
CREATE TABLE public.premium_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'premium',
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Premium status viewable by everyone"
  ON public.premium_subscriptions FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own subscription"
  ON public.premium_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON public.premium_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Saved chapters table
CREATE TABLE public.saved_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, chapter_id)
);

ALTER TABLE public.saved_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved chapters"
  ON public.saved_chapters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save chapters"
  ON public.saved_chapters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave chapters"
  ON public.saved_chapters FOR DELETE
  USING (auth.uid() = user_id);

-- Add premium_theme to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_theme TEXT DEFAULT NULL;
