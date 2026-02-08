
-- Create announcements table for admin news
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Everyone can read active announcements
CREATE POLICY "Active announcements are viewable by authenticated users"
ON public.announcements
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Only admins can create announcements
CREATE POLICY "Admins can create announcements"
ON public.announcements
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update announcements
CREATE POLICY "Admins can update announcements"
ON public.announcements
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete announcements
CREATE POLICY "Admins can delete announcements"
ON public.announcements
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Track which users have dismissed which announcements
CREATE TABLE public.announcement_dismissals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

-- Users can see their own dismissals
CREATE POLICY "Users can view their own dismissals"
ON public.announcement_dismissals
FOR SELECT
USING (auth.uid() = user_id);

-- Users can dismiss announcements
CREATE POLICY "Users can dismiss announcements"
ON public.announcement_dismissals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for announcements
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
