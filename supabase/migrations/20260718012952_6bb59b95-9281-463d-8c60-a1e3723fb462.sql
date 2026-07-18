
-- 1. INTERACTIVE STORIES
CREATE TABLE public.story_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title TEXT, content TEXT NOT NULL,
  is_start BOOLEAN NOT NULL DEFAULT false,
  is_ending BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_nodes TO authenticated;
GRANT SELECT ON public.story_nodes TO anon;
GRANT ALL ON public.story_nodes TO service_role;
ALTER TABLE public.story_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sn_read" ON public.story_nodes FOR SELECT USING (true);
CREATE POLICY "sn_manage" ON public.story_nodes FOR ALL USING (EXISTS(SELECT 1 FROM public.chapters c JOIN public.books b ON b.id=c.book_id WHERE c.id=chapter_id AND b.author_id=auth.uid())) WITH CHECK (EXISTS(SELECT 1 FROM public.chapters c JOIN public.books b ON b.id=c.book_id WHERE c.id=chapter_id AND b.author_id=auth.uid()));
CREATE TRIGGER trg_story_nodes_upd BEFORE UPDATE ON public.story_nodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.story_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id UUID NOT NULL REFERENCES public.story_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES public.story_nodes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_choices TO authenticated;
GRANT SELECT ON public.story_choices TO anon;
GRANT ALL ON public.story_choices TO service_role;
ALTER TABLE public.story_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc_read" ON public.story_choices FOR SELECT USING (true);
CREATE POLICY "sc_manage" ON public.story_choices FOR ALL USING (EXISTS(SELECT 1 FROM public.story_nodes n JOIN public.chapters c ON c.id=n.chapter_id JOIN public.books b ON b.id=c.book_id WHERE n.id=from_node_id AND b.author_id=auth.uid())) WITH CHECK (EXISTS(SELECT 1 FROM public.story_nodes n JOIN public.chapters c ON c.id=n.chapter_id JOIN public.books b ON b.id=c.book_id WHERE n.id=from_node_id AND b.author_id=auth.uid()));

-- 2. UNIVERSES
CREATE TABLE public.universes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT, cover_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.universes TO authenticated;
GRANT SELECT ON public.universes TO anon;
GRANT ALL ON public.universes TO service_role;
ALTER TABLE public.universes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "u_read" ON public.universes FOR SELECT USING (is_public OR owner_id=auth.uid());
CREATE POLICY "u_manage" ON public.universes FOR ALL USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE TRIGGER trg_universes_upd BEFORE UPDATE ON public.universes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.universe_books (
  universe_id UUID NOT NULL REFERENCES public.universes(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(universe_id, book_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.universe_books TO authenticated;
GRANT SELECT ON public.universe_books TO anon;
GRANT ALL ON public.universe_books TO service_role;
ALTER TABLE public.universe_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ub_read" ON public.universe_books FOR SELECT USING (true);
CREATE POLICY "ub_manage" ON public.universe_books FOR ALL USING (EXISTS(SELECT 1 FROM public.universes u WHERE u.id=universe_id AND u.owner_id=auth.uid())) WITH CHECK (EXISTS(SELECT 1 FROM public.universes u WHERE u.id=universe_id AND u.owner_id=auth.uid()));

CREATE TABLE public.glossary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  universe_id UUID NOT NULL REFERENCES public.universes(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('character','place','object','concept','event')),
  name TEXT NOT NULL, description TEXT, image_url TEXT,
  aliases TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glossary_entries TO authenticated;
GRANT SELECT ON public.glossary_entries TO anon;
GRANT ALL ON public.glossary_entries TO service_role;
ALTER TABLE public.glossary_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ge_read" ON public.glossary_entries FOR SELECT USING (EXISTS(SELECT 1 FROM public.universes u WHERE u.id=universe_id AND (u.is_public OR u.owner_id=auth.uid())));
CREATE POLICY "ge_manage" ON public.glossary_entries FOR ALL USING (EXISTS(SELECT 1 FROM public.universes u WHERE u.id=universe_id AND u.owner_id=auth.uid())) WITH CHECK (EXISTS(SELECT 1 FROM public.universes u WHERE u.id=universe_id AND u.owner_id=auth.uid()));
CREATE TRIGGER trg_glossary_upd BEFORE UPDATE ON public.glossary_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. BETA READERS
CREATE TABLE public.beta_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','revoked')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(book_id, reader_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beta_invitations TO authenticated;
GRANT ALL ON public.beta_invitations TO service_role;
ALTER TABLE public.beta_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bi_read" ON public.beta_invitations FOR SELECT USING (author_id=auth.uid() OR reader_id=auth.uid());
CREATE POLICY "bi_insert" ON public.beta_invitations FOR INSERT WITH CHECK (author_id=auth.uid());
CREATE POLICY "bi_update" ON public.beta_invitations FOR UPDATE USING (author_id=auth.uid() OR reader_id=auth.uid()) WITH CHECK (author_id=auth.uid() OR reader_id=auth.uid());
CREATE POLICY "bi_delete" ON public.beta_invitations FOR DELETE USING (author_id=auth.uid());

CREATE TABLE public.beta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  reader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beta_feedback TO authenticated;
GRANT ALL ON public.beta_feedback TO service_role;
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bf_read" ON public.beta_feedback FOR SELECT USING (reader_id=auth.uid() OR EXISTS(SELECT 1 FROM public.books b WHERE b.id=book_id AND b.author_id=auth.uid()));
CREATE POLICY "bf_insert" ON public.beta_feedback FOR INSERT WITH CHECK (reader_id=auth.uid() AND EXISTS(SELECT 1 FROM public.beta_invitations i WHERE i.book_id=beta_feedback.book_id AND i.reader_id=auth.uid() AND i.status='accepted'));
CREATE POLICY "bf_update" ON public.beta_feedback FOR UPDATE USING (reader_id=auth.uid()) WITH CHECK (reader_id=auth.uid());
CREATE POLICY "bf_delete" ON public.beta_feedback FOR DELETE USING (reader_id=auth.uid() OR EXISTS(SELECT 1 FROM public.books b WHERE b.id=book_id AND b.author_id=auth.uid()));

-- 4. AUTHOR BLOGS
CREATE TABLE public.author_blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, content TEXT NOT NULL, cover_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT true,
  views_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.author_blogs TO authenticated;
GRANT SELECT ON public.author_blogs TO anon;
GRANT ALL ON public.author_blogs TO service_role;
ALTER TABLE public.author_blogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ab_read" ON public.author_blogs FOR SELECT USING (is_published OR author_id=auth.uid());
CREATE POLICY "ab_manage" ON public.author_blogs FOR ALL USING (author_id=auth.uid()) WITH CHECK (author_id=auth.uid());
CREATE TRIGGER trg_author_blogs_upd BEFORE UPDATE ON public.author_blogs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. COLLECTIBLE CARDS
CREATE TABLE public.collectible_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, description TEXT, image_url TEXT,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary','mythic')),
  related_book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  related_universe_id UUID REFERENCES public.universes(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collectible_cards TO authenticated;
GRANT SELECT ON public.collectible_cards TO anon;
GRANT ALL ON public.collectible_cards TO service_role;
ALTER TABLE public.collectible_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_read" ON public.collectible_cards FOR SELECT USING (true);
CREATE POLICY "cc_admin" ON public.collectible_cards FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE public.user_collectible_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.collectible_cards(id) ON DELETE CASCADE,
  is_displayed BOOLEAN NOT NULL DEFAULT false,
  obtained_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, card_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_collectible_cards TO authenticated;
GRANT SELECT ON public.user_collectible_cards TO anon;
GRANT ALL ON public.user_collectible_cards TO service_role;
ALTER TABLE public.user_collectible_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ucc_read" ON public.user_collectible_cards FOR SELECT USING (true);
CREATE POLICY "ucc_manage" ON public.user_collectible_cards FOR ALL USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

-- 6. PREORDERS
CREATE TABLE public.book_preorders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  release_date TIMESTAMPTZ, amount_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','paid','fulfilled','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_preorders TO authenticated;
GRANT ALL ON public.book_preorders TO service_role;
ALTER TABLE public.book_preorders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bp_read" ON public.book_preorders FOR SELECT USING (user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.books b WHERE b.id=book_id AND b.author_id=auth.uid()));
CREATE POLICY "bp_insert" ON public.book_preorders FOR INSERT WITH CHECK (user_id=auth.uid());
CREATE POLICY "bp_update" ON public.book_preorders FOR UPDATE USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE POLICY "bp_delete" ON public.book_preorders FOR DELETE USING (user_id=auth.uid());

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS release_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preorder_price_cents INTEGER;

-- 7. AMBASSADORS
CREATE TABLE public.ambassadors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','diamond')),
  points INTEGER NOT NULL DEFAULT 0, region TEXT, bio TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ambassadors TO authenticated;
GRANT SELECT ON public.ambassadors TO anon;
GRANT ALL ON public.ambassadors TO service_role;
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "am_read" ON public.ambassadors FOR SELECT USING (is_active OR user_id=auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "am_insert" ON public.ambassadors FOR INSERT WITH CHECK (user_id=auth.uid());
CREATE POLICY "am_update" ON public.ambassadors FOR UPDATE USING (has_role(auth.uid(),'admin') OR user_id=auth.uid()) WITH CHECK (has_role(auth.uid(),'admin') OR user_id=auth.uid());
CREATE POLICY "am_delete" ON public.ambassadors FOR DELETE USING (has_role(auth.uid(),'admin'));

CREATE TABLE public.ambassador_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, description TEXT,
  points_reward INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ambassador_tasks TO authenticated;
GRANT SELECT ON public.ambassador_tasks TO anon;
GRANT ALL ON public.ambassador_tasks TO service_role;
ALTER TABLE public.ambassador_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "at_read" ON public.ambassador_tasks FOR SELECT USING (true);
CREATE POLICY "at_admin" ON public.ambassador_tasks FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 8. WEBCOMICS
CREATE TABLE public.webcomics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT, cover_url TEXT, genre TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webcomics TO authenticated;
GRANT SELECT ON public.webcomics TO anon;
GRANT ALL ON public.webcomics TO service_role;
ALTER TABLE public.webcomics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wc_read" ON public.webcomics FOR SELECT USING (is_published OR author_id=auth.uid());
CREATE POLICY "wc_manage" ON public.webcomics FOR ALL USING (author_id=auth.uid()) WITH CHECK (author_id=auth.uid());
CREATE TRIGGER trg_webcomics_upd BEFORE UPDATE ON public.webcomics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.webcomic_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webcomic_id UUID NOT NULL REFERENCES public.webcomics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  episode_number INTEGER NOT NULL DEFAULT 1,
  panel_urls TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webcomic_episodes TO authenticated;
GRANT SELECT ON public.webcomic_episodes TO anon;
GRANT ALL ON public.webcomic_episodes TO service_role;
ALTER TABLE public.webcomic_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "we_read" ON public.webcomic_episodes FOR SELECT USING (is_published OR EXISTS(SELECT 1 FROM public.webcomics w WHERE w.id=webcomic_id AND w.author_id=auth.uid()));
CREATE POLICY "we_manage" ON public.webcomic_episodes FOR ALL USING (EXISTS(SELECT 1 FROM public.webcomics w WHERE w.id=webcomic_id AND w.author_id=auth.uid())) WITH CHECK (EXISTS(SELECT 1 FROM public.webcomics w WHERE w.id=webcomic_id AND w.author_id=auth.uid()));
CREATE TRIGGER trg_webcomic_ep_upd BEFORE UPDATE ON public.webcomic_episodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Webcomic panels storage policies (bucket already exists, private)
CREATE POLICY "wcp_read_auth" ON storage.objects FOR SELECT USING (bucket_id='webcomic-panels' AND auth.uid() IS NOT NULL);
CREATE POLICY "wcp_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id='webcomic-panels' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "wcp_delete" ON storage.objects FOR DELETE USING (bucket_id='webcomic-panels' AND (storage.foldername(name))[1]=auth.uid()::text);

-- SECURITY FIXES
DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can lookup invite by code" ON public.group_invitations;
