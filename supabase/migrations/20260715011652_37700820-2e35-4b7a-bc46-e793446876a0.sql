
-- 1) Fix security finding: remove public read policy on chat-media
DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;

-- 2) Message reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view reactions"
ON public.message_reactions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.messages m
  JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
  WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()
));

CREATE POLICY "Participants can react"
ON public.message_reactions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.messages m
  JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
  WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()
));

CREATE POLICY "Users can remove own reactions"
ON public.message_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- 3) Messages: reply / edit / soft-delete
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- Enable UPDATE realtime on messages for edits
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 4) Profile: chat wallpaper preference (global, per-user)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS chat_wallpaper TEXT;
