
-- Events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  rules TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event participants
CREATE TABLE public.event_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Event messages (global chat per event)
CREATE TABLE public.event_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Events viewable by authenticated" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can create events" ON public.events FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update events" ON public.events FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Event participants policies
CREATE POLICY "Participants viewable by authenticated" ON public.event_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join events" ON public.event_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage participants" ON public.event_participants FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can remove participants" ON public.event_participants FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can leave events" ON public.event_participants FOR DELETE USING (auth.uid() = user_id);

-- Event messages policies
CREATE POLICY "Messages viewable by participants" ON public.event_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.event_participants WHERE event_id = event_messages.event_id AND user_id = auth.uid())
);
CREATE POLICY "Participants can send messages" ON public.event_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.event_participants WHERE event_id = event_messages.event_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can delete event messages" ON public.event_messages FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for event messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_messages;

-- Function to update book stats (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_book_stats(
  p_book_id UUID,
  p_likes_delta INTEGER DEFAULT 0,
  p_reads_delta INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.books
  SET likes_count = GREATEST(0, COALESCE(likes_count, 0) + p_likes_delta),
      reads_count = GREATEST(0, COALESCE(reads_count, 0) + p_reads_delta)
  WHERE id = p_book_id;
END;
$$;
