
-- Fix overly permissive RLS policies

-- Drop and recreate notification insert policy to require authenticated user
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate promotion_views insert policy to track who viewed
DROP POLICY IF EXISTS "Anyone can insert promotion views" ON public.promotion_views;
CREATE POLICY "Authenticated users can insert promotion views"
ON public.promotion_views FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));
