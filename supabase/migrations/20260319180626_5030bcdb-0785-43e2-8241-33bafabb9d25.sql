
-- Weapons catalog (admins create these)
CREATE TABLE public.weapons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  base_damage INTEGER NOT NULL DEFAULT 1,
  price INTEGER NOT NULL DEFAULT 50,
  rarity TEXT NOT NULL DEFAULT 'common', -- common, rare, epic, legendary
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.weapons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weapons viewable by authenticated" ON public.weapons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can create weapons" ON public.weapons FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update weapons" ON public.weapons FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete weapons" ON public.weapons FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- User owned weapons with upgrade level (1-10)
CREATE TABLE public.user_weapons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  weapon_id UUID NOT NULL REFERENCES public.weapons(id) ON DELETE CASCADE,
  upgrade_level INTEGER NOT NULL DEFAULT 1,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, weapon_id)
);
ALTER TABLE public.user_weapons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own weapons" ON public.user_weapons FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can buy weapons" ON public.user_weapons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can upgrade weapons" ON public.user_weapons FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can sell weapons" ON public.user_weapons FOR DELETE USING (auth.uid() = user_id);

-- Active loadout (max 4 weapons equipped for base combat)
CREATE TABLE public.weapon_loadout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_weapon_id UUID NOT NULL REFERENCES public.user_weapons(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 4),
  equipped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, slot_number),
  UNIQUE(user_id, user_weapon_id)
);
ALTER TABLE public.weapon_loadout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own loadout" ON public.weapon_loadout FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can equip weapons" ON public.weapon_loadout FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unequip weapons" ON public.weapon_loadout FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for weapon images
INSERT INTO storage.buckets (id, name, public) VALUES ('weapon-images', 'weapon-images', true);
CREATE POLICY "Anyone can view weapon images" ON storage.objects FOR SELECT USING (bucket_id = 'weapon-images');
CREATE POLICY "Admins can upload weapon images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'weapon-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete weapon images" ON storage.objects FOR DELETE USING (bucket_id = 'weapon-images' AND auth.uid() IS NOT NULL);

-- Function to buy a weapon using coins
CREATE OR REPLACE FUNCTION public.buy_weapon(p_weapon_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_price INTEGER;
  v_balance INTEGER;
  v_weapon_name TEXT;
BEGIN
  SELECT price, name INTO v_price, v_weapon_name FROM weapons WHERE id = p_weapon_id;
  IF v_price IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Arma no encontrada'); END IF;

  IF EXISTS (SELECT 1 FROM user_weapons WHERE user_id = auth.uid() AND weapon_id = p_weapon_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ya tienes esta arma');
  END IF;

  SELECT balance INTO v_balance FROM user_coins WHERE user_id = auth.uid();
  IF v_balance IS NULL OR v_balance < v_price THEN
    RETURN jsonb_build_object('success', false, 'message', 'No tienes suficientes monedas');
  END IF;

  UPDATE user_coins SET balance = balance - v_price, updated_at = now() WHERE user_id = auth.uid();
  INSERT INTO coin_transactions (user_id, amount, transaction_type, description)
    VALUES (auth.uid(), -v_price, 'weapon_purchase', 'Compra: ' || v_weapon_name);
  INSERT INTO user_weapons (user_id, weapon_id) VALUES (auth.uid(), p_weapon_id);

  RETURN jsonb_build_object('success', true, 'message', 'Arma comprada');
END;
$$;

-- Function to upgrade a weapon (cost = current_level * 30 coins)
CREATE OR REPLACE FUNCTION public.upgrade_weapon(p_user_weapon_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_level INTEGER;
  v_cost INTEGER;
  v_balance INTEGER;
BEGIN
  SELECT upgrade_level INTO v_level FROM user_weapons WHERE id = p_user_weapon_id AND user_id = auth.uid();
  IF v_level IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Arma no encontrada'); END IF;
  IF v_level >= 10 THEN RETURN jsonb_build_object('success', false, 'message', 'Nivel máximo alcanzado'); END IF;

  v_cost := v_level * 30;
  SELECT balance INTO v_balance FROM user_coins WHERE user_id = auth.uid();
  IF v_balance IS NULL OR v_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Necesitas ' || v_cost || ' monedas');
  END IF;

  UPDATE user_coins SET balance = balance - v_cost, updated_at = now() WHERE user_id = auth.uid();
  INSERT INTO coin_transactions (user_id, amount, transaction_type, description)
    VALUES (auth.uid(), -v_cost, 'weapon_upgrade', 'Mejora arma nivel ' || (v_level + 1));
  UPDATE user_weapons SET upgrade_level = v_level + 1 WHERE id = p_user_weapon_id;

  RETURN jsonb_build_object('success', true, 'new_level', v_level + 1, 'cost', v_cost);
END;
$$;

-- Updated attack_base to use weapon damage
CREATE OR REPLACE FUNCTION public.attack_base(p_base_id uuid, p_attacker_gang_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_base territory_bases%ROWTYPE;
  v_member_exists boolean;
  v_new_hp int;
  v_defender_name text;
  v_total_damage int;
BEGIN
  SELECT EXISTS(SELECT 1 FROM gang_members WHERE gang_id = p_attacker_gang_id AND user_id = auth.uid()) INTO v_member_exists;
  IF NOT v_member_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'No eres miembro de esta gang');
  END IF;

  -- Calculate total damage from equipped weapons
  SELECT COALESCE(SUM(w.base_damage + (uw.upgrade_level - 1)), 0)
  INTO v_total_damage
  FROM weapon_loadout wl
  JOIN user_weapons uw ON uw.id = wl.user_weapon_id
  JOIN weapons w ON w.id = uw.weapon_id
  WHERE wl.user_id = auth.uid();

  -- Minimum damage is 1 (fists)
  IF v_total_damage < 1 THEN v_total_damage := 1; END IF;

  SELECT * INTO v_base FROM territory_bases WHERE id = p_base_id FOR UPDATE;

  IF v_base.controlling_gang_id = p_attacker_gang_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'No puedes atacar tu propia base');
  END IF;

  IF v_base.controlling_gang_id IS NOT NULL AND EXISTS(
    SELECT 1 FROM gang_allies WHERE
      (gang_id = p_attacker_gang_id AND allied_gang_id = v_base.controlling_gang_id) OR
      (gang_id = v_base.controlling_gang_id AND allied_gang_id = p_attacker_gang_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'No puedes atacar la base de un aliado');
  END IF;

  IF v_base.controlling_gang_id IS NULL THEN
    UPDATE territory_bases SET hp = 5, controlling_gang_id = p_attacker_gang_id, controlled_since = now(), defender_id = NULL, defender_hp = 5, defender_respawn_at = NULL WHERE id = p_base_id;
    INSERT INTO base_control_history (base_id, gang_id) VALUES (p_base_id, p_attacker_gang_id);
    INSERT INTO base_attacks (base_id, attacker_id, attacker_gang_id) VALUES (p_base_id, auth.uid(), p_attacker_gang_id);
    RETURN jsonb_build_object('success', true, 'captured', true, 'new_hp', 5, 'damage', v_total_damage);
  END IF;

  IF v_base.defender_id IS NOT NULL AND v_base.defender_hp <= 0 AND v_base.defender_respawn_at IS NOT NULL AND v_base.defender_respawn_at > now() THEN
    UPDATE base_control_history SET ended_at = now() WHERE base_id = p_base_id AND ended_at IS NULL;
    UPDATE territory_bases SET hp = 5, controlling_gang_id = p_attacker_gang_id, controlled_since = now(), defender_id = NULL, defender_hp = 5, defender_respawn_at = NULL WHERE id = p_base_id;
    INSERT INTO base_control_history (base_id, gang_id) VALUES (p_base_id, p_attacker_gang_id);
    INSERT INTO base_attacks (base_id, attacker_id, attacker_gang_id) VALUES (p_base_id, auth.uid(), p_attacker_gang_id);
    RETURN jsonb_build_object('success', true, 'captured', true, 'new_hp', 5, 'damage', v_total_damage);
  END IF;

  IF v_base.defender_id IS NULL OR (v_base.defender_respawn_at IS NOT NULL AND v_base.defender_respawn_at <= now()) THEN
    v_new_hp := GREATEST(0, v_base.hp - v_total_damage);
    INSERT INTO base_attacks (base_id, attacker_id, attacker_gang_id) VALUES (p_base_id, auth.uid(), p_attacker_gang_id);

    IF v_new_hp = 0 THEN
      UPDATE base_control_history SET ended_at = now() WHERE base_id = p_base_id AND ended_at IS NULL;
      UPDATE territory_bases SET hp = 5, controlling_gang_id = p_attacker_gang_id, controlled_since = now(), defender_id = NULL, defender_hp = 5, defender_respawn_at = NULL WHERE id = p_base_id;
      INSERT INTO base_control_history (base_id, gang_id) VALUES (p_base_id, p_attacker_gang_id);
      RETURN jsonb_build_object('success', true, 'captured', true, 'new_hp', 5, 'damage', v_total_damage);
    ELSE
      UPDATE territory_bases SET hp = v_new_hp WHERE id = p_base_id;
      RETURN jsonb_build_object('success', true, 'captured', false, 'new_hp', v_new_hp, 'hit_base', true, 'damage', v_total_damage);
    END IF;
  END IF;

  -- Active defender
  v_new_hp := GREATEST(0, v_base.defender_hp - v_total_damage);
  INSERT INTO base_attacks (base_id, attacker_id, attacker_gang_id) VALUES (p_base_id, auth.uid(), p_attacker_gang_id);
  SELECT COALESCE(display_name, username, 'Usuario') INTO v_defender_name FROM profiles WHERE id = v_base.defender_id;

  IF v_new_hp = 0 THEN
    UPDATE territory_bases SET defender_hp = 0, defender_respawn_at = now() + interval '4 seconds' WHERE id = p_base_id;
    RETURN jsonb_build_object('success', true, 'captured', false, 'defender_killed', true, 'defender_name', v_defender_name, 'respawn_at', (now() + interval '4 seconds')::text, 'damage', v_total_damage);
  ELSE
    UPDATE territory_bases SET defender_hp = v_new_hp WHERE id = p_base_id;
    RETURN jsonb_build_object('success', true, 'captured', false, 'defender_killed', false, 'defender_hp', v_new_hp, 'defender_name', v_defender_name, 'damage', v_total_damage);
  END IF;
END;
$$;
