
-- Bot system tables
CREATE TABLE public.user_bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  gang_id UUID NOT NULL REFERENCES public.gangs(id) ON DELETE CASCADE,
  bot_name TEXT NOT NULL DEFAULT 'Bot',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.user_bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bots" ON public.user_bots FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own bots" ON public.user_bots FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own bots" ON public.user_bots FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own bots" ON public.user_bots FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Fort events table
CREATE TABLE public.fort_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  top_gangs JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fort_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read fort events" ON public.fort_events FOR SELECT TO authenticated USING (true);

-- Bot attack log
CREATE TABLE public.bot_attack_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.user_bots(id) ON DELETE CASCADE,
  base_id UUID NOT NULL REFERENCES public.territory_bases(id) ON DELETE CASCADE,
  damage_dealt INTEGER NOT NULL DEFAULT 1,
  attacked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_attack_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own bot logs" ON public.bot_attack_log FOR SELECT TO authenticated USING (
  bot_id IN (SELECT id FROM public.user_bots WHERE user_id = auth.uid())
);

-- Buy bot function (50 coins each, max 10 per user)
CREATE OR REPLACE FUNCTION public.buy_bot(p_gang_id UUID, p_bot_name TEXT DEFAULT 'Bot')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance INTEGER;
  v_bot_count INTEGER;
  v_price INTEGER := 50;
  v_member_exists BOOLEAN;
BEGIN
  -- Check membership
  SELECT EXISTS(SELECT 1 FROM gang_members WHERE gang_id = p_gang_id AND user_id = auth.uid()) INTO v_member_exists;
  IF NOT v_member_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'No eres miembro de esta gang');
  END IF;

  -- Check bot count
  SELECT COUNT(*) INTO v_bot_count FROM user_bots WHERE user_id = auth.uid();
  IF v_bot_count >= 10 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Máximo 10 bots permitidos');
  END IF;

  -- Check balance
  SELECT balance INTO v_balance FROM user_coins WHERE user_id = auth.uid();
  IF v_balance IS NULL OR v_balance < v_price THEN
    RETURN jsonb_build_object('success', false, 'message', 'No tienes suficientes monedas (50 requeridas)');
  END IF;

  -- Deduct coins
  UPDATE user_coins SET balance = balance - v_price, updated_at = now() WHERE user_id = auth.uid();
  INSERT INTO coin_transactions (user_id, amount, transaction_type, description)
    VALUES (auth.uid(), -v_price, 'bot_purchase', 'Compra de bot: ' || p_bot_name);

  -- Create bot
  INSERT INTO user_bots (user_id, gang_id, bot_name) VALUES (auth.uid(), p_gang_id, p_bot_name);

  RETURN jsonb_build_object('success', true, 'message', 'Bot comprado');
END;
$$;

-- Bot auto-attack function (called by edge function)
CREATE OR REPLACE FUNCTION public.bot_auto_attack(p_bot_id UUID, p_base_id UUID, p_gang_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_base territory_bases%ROWTYPE;
  v_new_hp INTEGER;
  v_damage INTEGER := 1;
BEGIN
  SELECT * INTO v_base FROM territory_bases WHERE id = p_base_id FOR UPDATE;
  
  IF v_base.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Base not found');
  END IF;

  -- Don't attack own base or allied base
  IF v_base.controlling_gang_id = p_gang_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Own base');
  END IF;

  IF v_base.controlling_gang_id IS NOT NULL AND EXISTS(
    SELECT 1 FROM gang_allies WHERE
      (gang_id = p_gang_id AND allied_gang_id = v_base.controlling_gang_id) OR
      (gang_id = v_base.controlling_gang_id AND allied_gang_id = p_gang_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Allied base');
  END IF;

  -- Free base: capture
  IF v_base.controlling_gang_id IS NULL THEN
    UPDATE territory_bases SET hp = 5, controlling_gang_id = p_gang_id, controlled_since = now(), defender_id = NULL, defender_hp = 5, defender_respawn_at = NULL WHERE id = p_base_id;
    INSERT INTO base_control_history (base_id, gang_id) VALUES (p_base_id, p_gang_id);
    INSERT INTO bot_attack_log (bot_id, base_id, damage_dealt) VALUES (p_bot_id, p_base_id, v_damage);
    RETURN jsonb_build_object('success', true, 'captured', true);
  END IF;

  -- Has active defender
  IF v_base.defender_id IS NOT NULL AND v_base.defender_hp > 0 THEN
    v_new_hp := GREATEST(0, v_base.defender_hp - v_damage);
    IF v_new_hp = 0 THEN
      UPDATE territory_bases SET defender_hp = 0, defender_respawn_at = now() + interval '4 seconds' WHERE id = p_base_id;
    ELSE
      UPDATE territory_bases SET defender_hp = v_new_hp WHERE id = p_base_id;
    END IF;
    INSERT INTO bot_attack_log (bot_id, base_id, damage_dealt) VALUES (p_bot_id, p_base_id, v_damage);
    RETURN jsonb_build_object('success', true, 'hit_defender', true, 'defender_hp', v_new_hp);
  END IF;

  -- Attack base HP
  v_new_hp := GREATEST(0, v_base.hp - v_damage);
  IF v_new_hp = 0 THEN
    UPDATE base_control_history SET ended_at = now() WHERE base_id = p_base_id AND ended_at IS NULL;
    UPDATE territory_bases SET hp = 5, controlling_gang_id = p_gang_id, controlled_since = now(), defender_id = NULL, defender_hp = 5, defender_respawn_at = NULL WHERE id = p_base_id;
    INSERT INTO base_control_history (base_id, gang_id) VALUES (p_base_id, p_gang_id);
  ELSE
    UPDATE territory_bases SET hp = v_new_hp WHERE id = p_base_id;
  END IF;
  INSERT INTO bot_attack_log (bot_id, base_id, damage_dealt) VALUES (p_bot_id, p_base_id, v_damage);
  RETURN jsonb_build_object('success', true, 'captured', v_new_hp = 0, 'new_hp', v_new_hp);
END;
$$;

-- Enable realtime for fort_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.fort_events;
