
-- 1) Link shop items to profile items
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS profile_item_id UUID REFERENCES public.profile_items(id) ON DELETE SET NULL;
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_category_check;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_category_check
  CHECK (category IN ('avatar_frame','badge','theme','effect','title','profile_background'));

-- 2) New animated profile backgrounds
INSERT INTO public.profile_items (name, description, item_type, rarity, price, css_value, image_url)
VALUES
  ('Galaxia Viva', 'Una galaxia en movimiento con estrellas girando', 'background', 'legendary', 300, 'pbg-galaxy', ''),
  ('Aurora Boreal', 'Luces del norte ondulando suavemente', 'background', 'epic', 220, 'pbg-aurora', ''),
  ('Nebulosa Violeta', 'Nubes cósmicas violetas en constante flujo', 'background', 'epic', 200, 'pbg-nebula', ''),
  ('Océano Profundo', 'Olas de luz azul en movimiento', 'background', 'rare', 150, 'pbg-ocean', ''),
  ('Atardecer Infinito', 'Un degradado cálido que respira', 'background', 'rare', 150, 'pbg-sunset', ''),
  ('Código Matrix', 'Lluvia digital verde animada', 'background', 'legendary', 280, 'pbg-matrix', '')
ON CONFLICT DO NOTHING;

-- 3) Shop entries linked to those items
INSERT INTO public.shop_items (name, description, price, category, emoji, is_active, profile_item_id, image_url)
SELECT pi.name, pi.description, pi.price, 'profile_background',
  CASE pi.css_value
    WHEN 'pbg-galaxy' THEN '🌌'
    WHEN 'pbg-aurora' THEN '🌠'
    WHEN 'pbg-nebula' THEN '🪐'
    WHEN 'pbg-ocean' THEN '🌊'
    WHEN 'pbg-sunset' THEN '🌇'
    ELSE '💚'
  END,
  true, pi.id, ''
FROM public.profile_items pi
WHERE pi.css_value IN ('pbg-galaxy','pbg-aurora','pbg-nebula','pbg-ocean','pbg-sunset','pbg-matrix')
  AND NOT EXISTS (SELECT 1 FROM public.shop_items s WHERE s.profile_item_id = pi.id);

-- 4) Purchase grants the profile item
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
  v_profile_item UUID;
BEGIN
  SELECT price, name, profile_item_id INTO v_price, v_item_name, v_profile_item
  FROM shop_items WHERE id = p_item_id AND is_active = true;
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

  IF v_profile_item IS NOT NULL THEN
    INSERT INTO user_items (user_id, item_id, is_equipped)
    VALUES (auth.uid(), v_profile_item, false)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Compra exitosa: ' || v_item_name);
END;
$$;

-- 5) Remove "bot" from bot usernames
UPDATE public.profiles
SET username = regexp_replace(username, '^bot[_-]?', '')
WHERE is_bot = true AND username ~* '^bot[_-]?';
