
-- Writer subscriptions
CREATE TABLE public.writer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL,
  writer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'supporter', 'patron')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subscriber_id, writer_id)
);

ALTER TABLE public.writer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.writer_subscriptions
  FOR SELECT USING (auth.uid() = subscriber_id);

CREATE POLICY "Writers can view their subscribers" ON public.writer_subscriptions
  FOR SELECT USING (auth.uid() = writer_id);

CREATE POLICY "Users can subscribe" ON public.writer_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = subscriber_id);

CREATE POLICY "Users can unsubscribe" ON public.writer_subscriptions
  FOR DELETE USING (auth.uid() = subscriber_id);

-- Shop items
CREATE TABLE public.shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 10,
  category TEXT NOT NULL DEFAULT 'badge' CHECK (category IN ('avatar_frame', 'badge', 'theme', 'effect', 'title')),
  image_url TEXT,
  emoji TEXT DEFAULT '🎁',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active shop items" ON public.shop_items
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage shop items" ON public.shop_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Shop purchases
CREATE TABLE public.shop_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.shop_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON public.shop_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can make purchases" ON public.shop_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reading sessions for advanced analytics
CREATE TABLE public.reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  pages_read INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.reading_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create sessions" ON public.reading_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Purchase function using coins
CREATE OR REPLACE FUNCTION public.purchase_shop_item(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price INTEGER;
  v_balance INTEGER;
  v_item_name TEXT;
BEGIN
  SELECT price, name INTO v_price, v_item_name FROM shop_items WHERE id = p_item_id AND is_active = true;
  IF v_price IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Item no disponible');
  END IF;

  IF EXISTS (SELECT 1 FROM shop_purchases WHERE user_id = auth.uid() AND item_id = p_item_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ya tienes este item');
  END IF;

  SELECT balance INTO v_balance FROM user_coins WHERE user_id = auth.uid();
  IF COALESCE(v_balance, 0) < v_price THEN
    RETURN jsonb_build_object('success', false, 'message', 'No tienes suficientes monedas (' || v_price || ' requeridas)');
  END IF;

  UPDATE user_coins SET balance = balance - v_price, updated_at = now() WHERE user_id = auth.uid();
  INSERT INTO coin_transactions (user_id, amount, transaction_type, description)
    VALUES (auth.uid(), -v_price, 'shop_purchase', 'Compra: ' || v_item_name);
  INSERT INTO shop_purchases (user_id, item_id) VALUES (auth.uid(), p_item_id);

  RETURN jsonb_build_object('success', true, 'message', 'Compra exitosa: ' || v_item_name);
END;
$$;
