
-- Create microstory_collaborators table
CREATE TABLE public.microstory_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  microstory_id UUID NOT NULL REFERENCES public.microstories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  UNIQUE(microstory_id, user_id)
);

ALTER TABLE public.microstory_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborators viewable by author and collaborator"
ON public.microstory_collaborators FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.microstories
    WHERE microstories.id = microstory_collaborators.microstory_id
    AND microstories.author_id = auth.uid()
  )
);

CREATE POLICY "Authors can invite collaborators"
ON public.microstory_collaborators FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.microstories
    WHERE microstories.id = microstory_collaborators.microstory_id
    AND microstories.author_id = auth.uid()
  )
);

CREATE POLICY "Authors can remove collaborators"
ON public.microstory_collaborators FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.microstories
    WHERE microstories.id = microstory_collaborators.microstory_id
    AND microstories.author_id = auth.uid()
  )
);

-- Create microstory_reposts table
CREATE TABLE public.microstory_reposts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  microstory_id UUID NOT NULL REFERENCES public.microstories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(microstory_id, user_id)
);

ALTER TABLE public.microstory_reposts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reposts are viewable by everyone"
ON public.microstory_reposts FOR SELECT
USING (true);

CREATE POLICY "Users can repost"
ON public.microstory_reposts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can undo repost"
ON public.microstory_reposts FOR DELETE
USING (auth.uid() = user_id);

-- Add reposts_count to microstories
ALTER TABLE public.microstories ADD COLUMN reposts_count INTEGER DEFAULT 0;
