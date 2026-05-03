
-- 1. dm_privacy column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dm_privacy text NOT NULL DEFAULT 'everyone'
    CHECK (dm_privacy IN ('everyone','followers','nobody'));

-- 2. Block DM creation when recipient doesn't allow it (1:1 only)
CREATE OR REPLACE FUNCTION public.enforce_dm_privacy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_group boolean;
  _other uuid;
  _privacy text;
  _follows boolean;
BEGIN
  -- Skip if inserting self
  IF NEW.user_id = auth.uid() THEN RETURN NEW; END IF;

  SELECT is_group INTO _is_group FROM public.conversations WHERE id = NEW.conversation_id;
  IF _is_group THEN RETURN NEW; END IF;

  -- Find the "other" participant (the one being added). NEW.user_id is being added.
  _other := NEW.user_id;
  SELECT dm_privacy INTO _privacy FROM public.profiles WHERE id = _other;
  IF _privacy IS NULL THEN _privacy := 'everyone'; END IF;

  IF _privacy = 'nobody' THEN
    RAISE EXCEPTION 'Este usuario no permite mensajes directos';
  ELSIF _privacy = 'followers' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.followers
      WHERE follower_id = _other AND following_id = auth.uid()
    ) INTO _follows;
    IF NOT _follows THEN
      RAISE EXCEPTION 'Solo los usuarios que siguen pueden enviar mensajes a esta cuenta';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_dm_privacy ON public.conversation_participants;
CREATE TRIGGER trg_enforce_dm_privacy
BEFORE INSERT ON public.conversation_participants
FOR EACH ROW EXECUTE FUNCTION public.enforce_dm_privacy();

-- 3. Allow conversation participants to read chat-media
DROP POLICY IF EXISTS "Owners read own chat media" ON storage.objects;

CREATE POLICY "Conversation participants read chat media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-media'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.conversation_participants cp
        ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = auth.uid()
        AND m.media_url = storage.objects.name
    )
  )
);
