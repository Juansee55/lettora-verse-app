
-- ===========================================
-- 1. CREATE ALL MISSING TRIGGERS for engagement counts
-- ===========================================

CREATE TRIGGER trigger_update_microstory_likes_count
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.update_microstory_likes_count();

CREATE TRIGGER trigger_update_microstory_reposts_count
AFTER INSERT OR DELETE ON public.microstory_reposts
FOR EACH ROW
EXECUTE FUNCTION public.update_microstory_reposts_count();

CREATE TRIGGER trigger_update_microstory_comments_count
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_microstory_comments_count();

CREATE TRIGGER trigger_update_book_likes_count
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.update_book_likes_count();

CREATE TRIGGER trigger_update_post_likes_count
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.update_post_likes_count();

CREATE TRIGGER trigger_update_post_comments_count
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comments_count();

CREATE TRIGGER trigger_notify_new_follower
AFTER INSERT ON public.followers
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_follower();

CREATE TRIGGER trigger_notify_new_like
AFTER INSERT ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_like();

CREATE TRIGGER trigger_notify_chapter_like
AFTER INSERT ON public.chapter_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_chapter_like();

CREATE TRIGGER trigger_notify_new_comment
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_comment();

CREATE TRIGGER trigger_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

CREATE TRIGGER trigger_update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trigger_notify_new_reader
AFTER INSERT ON public.reading_progress
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_reader();

-- ===========================================
-- 2. PROFILE STORE: Items, Coins, Purchases
-- ===========================================

CREATE TABLE public.profile_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL CHECK (item_type IN ('frame', 'background')),
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  price INTEGER NOT NULL DEFAULT 100,
  image_url TEXT NOT NULL,
  css_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Items viewable by everyone"
ON public.profile_items FOR SELECT USING (true);

CREATE TABLE public.user_coins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coins viewable by everyone"
ON public.user_coins FOR SELECT USING (true);

CREATE TABLE public.coin_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions"
ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE public.user_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.profile_items(id) ON DELETE CASCADE,
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own items viewable"
ON public.user_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Equipped items public"
ON public.user_items FOR SELECT USING (is_equipped = true);

CREATE POLICY "Users insert own items"
ON public.user_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own items"
ON public.user_items FOR UPDATE USING (auth.uid() = user_id);

-- Coin earning functions + triggers
CREATE OR REPLACE FUNCTION public.award_coins_on_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.user_coins (user_id, balance, total_earned)
  VALUES (NEW.user_id, 1, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_coins.balance + 1, total_earned = user_coins.total_earned + 1, updated_at = now();
  INSERT INTO public.coin_transactions (user_id, amount, transaction_type, description)
  VALUES (NEW.user_id, 1, 'like_given', 'Moneda por dar like');
  RETURN NEW;
END; $$;

CREATE TRIGGER trigger_award_coins_on_like
AFTER INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION public.award_coins_on_like();

CREATE OR REPLACE FUNCTION public.award_coins_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.user_coins (user_id, balance, total_earned)
  VALUES (NEW.user_id, 2, 2)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_coins.balance + 2, total_earned = user_coins.total_earned + 2, updated_at = now();
  INSERT INTO public.coin_transactions (user_id, amount, transaction_type, description)
  VALUES (NEW.user_id, 2, 'comment', 'Monedas por comentar');
  RETURN NEW;
END; $$;

CREATE TRIGGER trigger_award_coins_on_comment
AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.award_coins_on_comment();

CREATE OR REPLACE FUNCTION public.award_coins_on_repost()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.user_coins (user_id, balance, total_earned)
  VALUES (NEW.user_id, 1, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_coins.balance + 1, total_earned = user_coins.total_earned + 1, updated_at = now();
  INSERT INTO public.coin_transactions (user_id, amount, transaction_type, description)
  VALUES (NEW.user_id, 1, 'repost', 'Moneda por repostear');
  RETURN NEW;
END; $$;

CREATE TRIGGER trigger_award_coins_on_repost
AFTER INSERT ON public.microstory_reposts FOR EACH ROW EXECUTE FUNCTION public.award_coins_on_repost();

-- Purchase function
CREATE OR REPLACE FUNCTION public.purchase_item(p_user_id UUID, p_item_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_price INTEGER; v_balance INTEGER;
BEGIN
  SELECT price INTO v_price FROM public.profile_items WHERE id = p_item_id;
  IF v_price IS NULL THEN RETURN FALSE; END IF;
  SELECT balance INTO v_balance FROM public.user_coins WHERE user_id = p_user_id;
  IF v_balance IS NULL OR v_balance < v_price THEN RETURN FALSE; END IF;
  IF EXISTS (SELECT 1 FROM public.user_items WHERE user_id = p_user_id AND item_id = p_item_id) THEN RETURN FALSE; END IF;
  UPDATE public.user_coins SET balance = balance - v_price, updated_at = now() WHERE user_id = p_user_id;
  INSERT INTO public.coin_transactions (user_id, amount, transaction_type, description) VALUES (p_user_id, -v_price, 'purchase', 'Compra de item');
  INSERT INTO public.user_items (user_id, item_id) VALUES (p_user_id, p_item_id);
  RETURN TRUE;
END; $$;

-- ===========================================
-- 3. MENTIONS TABLE
-- ===========================================

CREATE TABLE public.mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentioner_id UUID NOT NULL,
  mentioned_user_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentions viewable by involved"
ON public.mentions FOR SELECT USING (auth.uid() = mentioner_id OR auth.uid() = mentioned_user_id);

CREATE POLICY "Users create mentions"
ON public.mentions FOR INSERT WITH CHECK (auth.uid() = mentioner_id);

CREATE OR REPLACE FUNCTION public.notify_mention()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _mentioner_name TEXT; _link TEXT;
BEGIN
  SELECT COALESCE(display_name, username, 'Alguien') INTO _mentioner_name FROM public.profiles WHERE id = NEW.mentioner_id;
  IF NEW.content_type = 'microstory' THEN _link := '/microstories';
  ELSIF NEW.content_type = 'post' THEN _link := '/feed';
  ELSE _link := NULL;
  END IF;
  IF NEW.mentioned_user_id != NEW.mentioner_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.mentioned_user_id, 'mention', 'Te mencionaron', _mentioner_name || ' te mencionó', _link);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trigger_notify_mention
AFTER INSERT ON public.mentions FOR EACH ROW EXECUTE FUNCTION public.notify_mention();

-- ===========================================
-- 4. SEED STORE ITEMS
-- ===========================================

INSERT INTO public.profile_items (name, description, item_type, rarity, price, image_url, css_value) VALUES
('Dorado Clásico', 'Marco dorado elegante', 'frame', 'common', 50, '/placeholder.svg', 'border-4 border-yellow-500'),
('Neón Azul', 'Marco con brillo neón azul', 'frame', 'rare', 150, '/placeholder.svg', 'border-4 border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.5)]'),
('Fuego Infernal', 'Marco con efecto de fuego', 'frame', 'epic', 300, '/placeholder.svg', 'border-4 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.6)]'),
('Aurora Boreal', 'Marco con degradado aurora', 'frame', 'legendary', 500, '/placeholder.svg', 'border-4 border-transparent bg-gradient-to-r from-green-400 via-blue-500 to-purple-600'),
('Cristal Oscuro', 'Marco cristalino oscuro', 'frame', 'rare', 200, '/placeholder.svg', 'border-4 border-slate-600 shadow-[0_0_10px_rgba(100,116,139,0.4)]'),
('Diamante', 'Marco de diamante brillante', 'frame', 'legendary', 600, '/placeholder.svg', 'border-4 border-cyan-300 shadow-[0_0_25px_rgba(103,232,249,0.7)]'),
('Galaxia Profunda', 'Fondo de galaxia espacial', 'background', 'rare', 200, '/placeholder.svg', 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800'),
('Atardecer Tropical', 'Fondo de atardecer cálido', 'background', 'common', 100, '/placeholder.svg', 'bg-gradient-to-br from-orange-400 via-rose-500 to-purple-600'),
('Matrix Digital', 'Fondo estilo matrix', 'background', 'epic', 350, '/placeholder.svg', 'bg-gradient-to-b from-black via-green-950 to-black'),
('Volcán Carmesí', 'Fondo volcánico intenso', 'background', 'legendary', 550, '/placeholder.svg', 'bg-gradient-to-br from-red-900 via-orange-800 to-yellow-600'),
('Océano Abisal', 'Profundidades del océano', 'background', 'epic', 400, '/placeholder.svg', 'bg-gradient-to-b from-blue-950 via-cyan-900 to-teal-800'),
('Nebulosa Rosa', 'Nebulosa estelar rosa', 'background', 'legendary', 700, '/placeholder.svg', 'bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700');
