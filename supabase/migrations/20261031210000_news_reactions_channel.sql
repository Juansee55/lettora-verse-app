-- Reactions for the administrator news channel.
CREATE TABLE IF NOT EXISTS public.news_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id uuid NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'love', 'fire', 'wow')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (news_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS news_reactions_news_lookup_idx
  ON public.news_reactions (news_id, reaction_type);

ALTER TABLE public.news_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "News reactions viewable by authenticated" ON public.news_reactions;
CREATE POLICY "News reactions viewable by authenticated"
  ON public.news_reactions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users create own news reactions" ON public.news_reactions;
CREATE POLICY "Users create own news reactions"
  ON public.news_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own news reactions" ON public.news_reactions;
CREATE POLICY "Users delete own news reactions"
  ON public.news_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
