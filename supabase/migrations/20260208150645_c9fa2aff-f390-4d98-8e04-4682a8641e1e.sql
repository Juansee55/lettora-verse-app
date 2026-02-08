
-- 1. Add description to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS description text;

-- 2. Add muted_until to conversation_participants for muting users
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS muted_until timestamp with time zone;

-- 3. Add media columns to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'text';

-- 4. Create chat-media storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies for chat-media
CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Anyone can view chat media"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');

CREATE POLICY "Users can delete their own chat media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 6. Allow admins/owners to mute participants (update muted_until)
CREATE POLICY "Admins can mute participants"
ON public.conversation_participants
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
    AND cp.role IN ('admin', 'owner')
  )
);
