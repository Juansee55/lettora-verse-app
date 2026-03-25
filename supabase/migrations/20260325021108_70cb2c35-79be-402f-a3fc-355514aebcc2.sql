
-- Literary posts table for the community feed
CREATE TABLE public.literary_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type text NOT NULL DEFAULT 'reflection' CHECK (post_type IN ('quote', 'reflection', 'recommendation', 'own_text')),
  content text NOT NULL,
  quote_text text,
  linked_book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  think_count integer NOT NULL DEFAULT 0,
  touched_count integer NOT NULL DEFAULT 0,
  want_read_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.literary_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Literary posts viewable by authenticated" ON public.literary_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own literary posts" ON public.literary_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own literary posts" ON public.literary_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own literary posts" ON public.literary_posts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins delete any literary post" ON public.literary_posts FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Post reactions table (literary reactions + classic like)
CREATE TABLE public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.literary_posts(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'think', 'touched', 'want_read')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id, reaction_type)
);

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions viewable by authenticated" ON public.post_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own reactions" ON public.post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reactions" ON public.post_reactions FOR DELETE USING (auth.uid() = user_id);

-- Add favorite_genres to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_genres text[] DEFAULT '{}';

-- Trigger to update reaction counts on literary_posts
CREATE OR REPLACE FUNCTION public.update_literary_post_reactions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.reaction_type = 'like' THEN
      UPDATE literary_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF NEW.reaction_type = 'think' THEN
      UPDATE literary_posts SET think_count = think_count + 1 WHERE id = NEW.post_id;
    ELSIF NEW.reaction_type = 'touched' THEN
      UPDATE literary_posts SET touched_count = touched_count + 1 WHERE id = NEW.post_id;
    ELSIF NEW.reaction_type = 'want_read' THEN
      UPDATE literary_posts SET want_read_count = want_read_count + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.reaction_type = 'like' THEN
      UPDATE literary_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
    ELSIF OLD.reaction_type = 'think' THEN
      UPDATE literary_posts SET think_count = GREATEST(0, think_count - 1) WHERE id = OLD.post_id;
    ELSIF OLD.reaction_type = 'touched' THEN
      UPDATE literary_posts SET touched_count = GREATEST(0, touched_count - 1) WHERE id = OLD.post_id;
    ELSIF OLD.reaction_type = 'want_read' THEN
      UPDATE literary_posts SET want_read_count = GREATEST(0, want_read_count - 1) WHERE id = OLD.post_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_literary_reactions_trigger
AFTER INSERT OR DELETE ON public.post_reactions
FOR EACH ROW EXECUTE FUNCTION public.update_literary_post_reactions();

-- Trigger to update comments count
CREATE OR REPLACE FUNCTION public.update_literary_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.commentable_type = 'literary_post' THEN
    UPDATE literary_posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.commentable_id;
  ELSIF TG_OP = 'DELETE' AND OLD.commentable_type = 'literary_post' THEN
    UPDATE literary_posts SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1) WHERE id = OLD.commentable_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_literary_comments_count_trigger
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_literary_post_comments_count();

-- Enable realtime for literary_posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.literary_posts;
