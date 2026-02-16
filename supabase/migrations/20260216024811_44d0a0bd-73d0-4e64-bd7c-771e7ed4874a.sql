
-- Create news table for admin-published news/updates
CREATE TABLE public.news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  news_type TEXT NOT NULL DEFAULT 'update', -- 'update', 'patch', 'bug'
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "News viewable by authenticated" ON public.news
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can create news" ON public.news
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update news" ON public.news
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete news" ON public.news
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view all news" ON public.news
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
