
-- Hashtags table
CREATE TABLE public.hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hashtags viewable by everyone" ON public.hashtags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert hashtags" ON public.hashtags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "System can update hashtag counts" ON public.hashtags FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Content-hashtag relationship
CREATE TABLE public.content_hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hashtag_id uuid NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  content_id uuid NOT NULL,
  content_type text NOT NULL, -- 'microstory', 'post', 'book'
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.content_hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Content hashtags viewable by everyone" ON public.content_hashtags FOR SELECT USING (true);
CREATE POLICY "Users can tag their content" ON public.content_hashtags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their tags" ON public.content_hashtags FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_content_hashtags_hashtag ON public.content_hashtags(hashtag_id);
CREATE INDEX idx_content_hashtags_content ON public.content_hashtags(content_id, content_type);
CREATE INDEX idx_hashtags_usage ON public.hashtags(usage_count DESC);
CREATE INDEX idx_hashtags_name_trgm ON public.hashtags(name);

-- Function to upsert hashtags and update counts
CREATE OR REPLACE FUNCTION public.upsert_hashtags(p_tags text[], p_content_id uuid, p_content_type text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tag text;
  tag_id uuid;
BEGIN
  -- Remove old hashtags for this content
  DELETE FROM public.content_hashtags WHERE content_id = p_content_id AND content_type = p_content_type;
  
  FOREACH tag IN ARRAY p_tags LOOP
    -- Upsert the hashtag
    INSERT INTO public.hashtags (name, usage_count)
    VALUES (lower(tag), 1)
    ON CONFLICT (name) DO UPDATE SET usage_count = hashtags.usage_count + 1
    RETURNING id INTO tag_id;
    
    -- Link to content
    INSERT INTO public.content_hashtags (hashtag_id, content_id, content_type, user_id)
    VALUES (tag_id, p_content_id, p_content_type, p_user_id);
  END LOOP;
END;
$$;
