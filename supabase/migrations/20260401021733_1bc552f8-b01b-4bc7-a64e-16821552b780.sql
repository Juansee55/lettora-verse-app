
-- Proposals table for user suggestions
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Users can create and view their own proposals
CREATE POLICY "Users can create proposals" ON public.proposals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own proposals" ON public.proposals
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Admins can update proposals
CREATE POLICY "Admins can update proposals" ON public.proposals
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Paragraph comments table
CREATE TABLE public.paragraph_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  paragraph_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.paragraph_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view paragraph comments" ON public.paragraph_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create paragraph comments" ON public.paragraph_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own paragraph comments" ON public.paragraph_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
