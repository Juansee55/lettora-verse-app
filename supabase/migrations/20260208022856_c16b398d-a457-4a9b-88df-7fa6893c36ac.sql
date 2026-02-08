
-- =============================================
-- 1. TRIGGERS: Auto-manage counts (fixes likes/reposts/comments)
-- =============================================

-- Microstory likes count
CREATE OR REPLACE FUNCTION public.update_microstory_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.likeable_type = 'microstory' THEN
    UPDATE microstories SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.likeable_id;
  ELSIF TG_OP = 'DELETE' AND OLD.likeable_type = 'microstory' THEN
    UPDATE microstories SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1) WHERE id = OLD.likeable_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_like_microstory_count
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.update_microstory_likes_count();

-- Microstory reposts count
CREATE OR REPLACE FUNCTION public.update_microstory_reposts_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE microstories SET reposts_count = COALESCE(reposts_count, 0) + 1 WHERE id = NEW.microstory_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE microstories SET reposts_count = GREATEST(0, COALESCE(reposts_count, 0) - 1) WHERE id = OLD.microstory_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_repost_microstory_count
AFTER INSERT OR DELETE ON public.microstory_reposts
FOR EACH ROW EXECUTE FUNCTION public.update_microstory_reposts_count();

-- Microstory comments count
CREATE OR REPLACE FUNCTION public.update_microstory_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.commentable_type = 'microstory' THEN
    UPDATE microstories SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.commentable_id;
  ELSIF TG_OP = 'DELETE' AND OLD.commentable_type = 'microstory' THEN
    UPDATE microstories SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1) WHERE id = OLD.commentable_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_comment_microstory_count
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_microstory_comments_count();

-- Book likes count
CREATE OR REPLACE FUNCTION public.update_book_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.likeable_type = 'book' THEN
    UPDATE books SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.likeable_id;
  ELSIF TG_OP = 'DELETE' AND OLD.likeable_type = 'book' THEN
    UPDATE books SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1) WHERE id = OLD.likeable_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_like_book_count
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.update_book_likes_count();

-- =============================================
-- 2. GROUP CHATS: Add role to participants
-- =============================================
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

-- =============================================
-- 3. GROUP INVITATIONS
-- =============================================
CREATE TABLE public.group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view group invitations" ON public.group_invitations
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = group_invitations.conversation_id AND user_id = auth.uid())
);

CREATE POLICY "Admins and owners can create invitations" ON public.group_invitations
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = group_invitations.conversation_id AND user_id = auth.uid() AND role IN ('admin', 'owner'))
);

CREATE POLICY "Admins and owners can delete invitations" ON public.group_invitations
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = group_invitations.conversation_id AND user_id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Anyone authenticated can read invite by code (to join)
CREATE POLICY "Anyone can lookup invite by code" ON public.group_invitations
FOR SELECT USING (auth.uid() IS NOT NULL);

-- =============================================
-- 4. POSTS TABLE (Publications feed)
-- =============================================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'text',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users create own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Post likes trigger
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.likeable_type = 'post' THEN
    UPDATE posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.likeable_id;
  ELSIF TG_OP = 'DELETE' AND OLD.likeable_type = 'post' THEN
    UPDATE posts SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1) WHERE id = OLD.likeable_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_like_post_count
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

-- Post comments trigger
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.commentable_type = 'post' THEN
    UPDATE posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.commentable_id;
  ELSIF TG_OP = 'DELETE' AND OLD.commentable_type = 'post' THEN
    UPDATE posts SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1) WHERE id = OLD.commentable_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_comment_post_count
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- =============================================
-- 5. STORIES TABLE (24h stories)
-- =============================================
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  media_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'text',
  text_content TEXT,
  background_color TEXT DEFAULT '#6B46C1',
  font_style TEXT DEFAULT 'default',
  expires_at TIMESTAMPTZ NOT NULL,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active stories viewable by authenticated" ON public.stories
FOR SELECT USING (auth.uid() IS NOT NULL AND expires_at > now());

CREATE POLICY "Users create own stories" ON public.stories
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own stories" ON public.stories
FOR DELETE USING (auth.uid() = user_id);

-- Story views
CREATE TABLE public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, user_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story owner sees views" ON public.story_views
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stories WHERE id = story_views.story_id AND user_id = auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "Users mark stories viewed" ON public.story_views
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 6. STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public post media view" ON storage.objects FOR SELECT USING (bucket_id = 'posts');
CREATE POLICY "Auth upload post media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users delete own post media" ON storage.objects FOR DELETE USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public story media view" ON storage.objects FOR SELECT USING (bucket_id = 'stories');
CREATE POLICY "Auth upload story media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users delete own story media" ON storage.objects FOR DELETE USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- 7. ENABLE REALTIME for messages
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
