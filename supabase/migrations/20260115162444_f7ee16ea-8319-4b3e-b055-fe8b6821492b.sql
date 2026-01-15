
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Create chapter_likes table
CREATE TABLE public.chapter_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chapter_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, chapter_id)
);

-- Enable RLS
ALTER TABLE public.chapter_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for chapter_likes
CREATE POLICY "Chapter likes are viewable by everyone"
ON public.chapter_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like chapters"
ON public.chapter_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike chapters"
ON public.chapter_likes FOR DELETE
USING (auth.uid() = user_id);

-- Create promotion_views table for statistics
CREATE TABLE public.promotion_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id UUID NOT NULL,
  user_id UUID,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promotion_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for promotion_views
CREATE POLICY "Anyone can insert promotion views"
ON public.promotion_views FOR INSERT
WITH CHECK (true);

CREATE POLICY "Promotion owners can view their stats"
ON public.promotion_views FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM book_promotions bp
    WHERE bp.id = promotion_views.promotion_id
    AND bp.user_id = auth.uid()
  )
);

-- Add likes_count to chapters table
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create index for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_chapter_likes_chapter_id ON public.chapter_likes(chapter_id);
CREATE INDEX idx_promotion_views_promotion_id ON public.promotion_views(promotion_id);
