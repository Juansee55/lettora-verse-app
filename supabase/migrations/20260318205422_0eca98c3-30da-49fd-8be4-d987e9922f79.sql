
-- Add defender columns to territory_bases
ALTER TABLE public.territory_bases 
  ADD COLUMN defender_id uuid DEFAULT NULL,
  ADD COLUMN defender_hp integer NOT NULL DEFAULT 5,
  ADD COLUMN defender_max_hp integer NOT NULL DEFAULT 5,
  ADD COLUMN defender_respawn_at timestamptz DEFAULT NULL;

-- Update existing bases to 5 HP
UPDATE public.territory_bases SET hp = 5, max_hp = 5;

-- Alter defaults for hp/max_hp
ALTER TABLE public.territory_bases ALTER COLUMN hp SET DEFAULT 5;
ALTER TABLE public.territory_bases ALTER COLUMN max_hp SET DEFAULT 5;

-- Replace attack_base function with new defender logic
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
BEGIN
  SELECT EXISTS(SELECT 1 FROM gang_members WHERE gang_id = p_attacker_gang_id AND user_id = auth.uid()) INTO v_member_exists;
  IF NOT v_member_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'No eres miembro de esta gang');
  END IF;

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

  -- If base has no controller, capture directly
  IF v_base.controlling_gang_id IS NULL THEN
    UPDATE territory_bases SET hp = 5, controlling_gang_id = p_attacker_gang_id, controlled_since = now(), defender_id = NULL, defender_hp = 5, defender_respawn_at = NULL WHERE id = p_base_id;
    INSERT INTO base_control_history (base_id, gang_id) VALUES (p_base_id, p_attacker_gang_id);
    INSERT INTO base_attacks (base_id, attacker_id, attacker_gang_id) VALUES (p_base_id, auth.uid(), p_attacker_gang_id);
    RETURN jsonb_build_object('success', true, 'captured', true, 'new_hp', 5);
  END IF;

  -- If defender is dead and still on cooldown, base is vulnerable - capture it
  IF v_base.defender_id IS NOT NULL AND v_base.defender_hp <= 0 AND v_base.defender_respawn_at IS NOT NULL AND v_base.defender_respawn_at > now() THEN
    UPDATE base_control_history SET ended_at = now() WHERE base_id = p_base_id AND ended_at IS NULL;
    UPDATE territory_bases SET hp = 5, controlling_gang_id = p_attacker_gang_id, controlled_since = now(), defender_id = NULL, defender_hp = 5, defender_respawn_at = NULL WHERE id = p_base_id;
    INSERT INTO base_control_history (base_id, gang_id) VALUES (p_base_id, p_attacker_gang_id);
    INSERT INTO base_attacks (base_id, attacker_id, attacker_gang_id) VALUES (p_base_id, auth.uid(), p_attacker_gang_id);
    RETURN jsonb_build_object('success', true, 'captured', true, 'new_hp', 5);
  END IF;

  -- If no defender or defender respawn expired, attack the base HP
  IF v_base.defender_id IS NULL OR (v_base.defender_respawn_at IS NOT NULL AND v_base.defender_respawn_at <= now()) THEN
    -- No active defender, attack base HP directly
    v_new_hp := GREATEST(0, v_base.hp - 1);
    INSERT INTO base_attacks (base_id, attacker_id, attacker_gang_id) VALUES (p_base_id, auth.uid(), p_attacker_gang_id);

    IF v_new_hp = 0 THEN
      UPDATE base_control_history SET ended_at = now() WHERE base_id = p_base_id AND ended_at IS NULL;
      UPDATE territory_bases SET hp = 5, controlling_gang_id = p_attacker_gang_id, controlled_since = now(), defender_id = NULL, defender_hp = 5, defender_respawn_at = NULL WHERE id = p_base_id;
      INSERT INTO base_control_history (base_id, gang_id) VALUES (p_base_id, p_attacker_gang_id);
      RETURN jsonb_build_object('success', true, 'captured', true, 'new_hp', 5);
    ELSE
      UPDATE territory_bases SET hp = v_new_hp WHERE id = p_base_id;
      RETURN jsonb_build_object('success', true, 'captured', false, 'new_hp', v_new_hp, 'hit_base', true);
    END IF;
  END IF;

  -- Active defender present, attack the defender
  v_new_hp := GREATEST(0, v_base.defender_hp - 1);
  INSERT INTO base_attacks (base_id, attacker_id, attacker_gang_id) VALUES (p_base_id, auth.uid(), p_attacker_gang_id);

  SELECT COALESCE(display_name, username, 'Usuario') INTO v_defender_name FROM profiles WHERE id = v_base.defender_id;

  IF v_new_hp = 0 THEN
    -- Defender killed, 4 second cooldown
    UPDATE territory_bases SET defender_hp = 0, defender_respawn_at = now() + interval '4 seconds' WHERE id = p_base_id;
    RETURN jsonb_build_object('success', true, 'captured', false, 'defender_killed', true, 'defender_name', v_defender_name, 'respawn_at', (now() + interval '4 seconds')::text);
  ELSE
    UPDATE territory_bases SET defender_hp = v_new_hp WHERE id = p_base_id;
    RETURN jsonb_build_object('success', true, 'captured', false, 'defender_killed', false, 'defender_hp', v_new_hp, 'defender_name', v_defender_name);
  END IF;
END;
$$;

-- Update heal_base to also allow entering as defender
CREATE OR REPLACE FUNCTION public.heal_base(p_base_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_base territory_bases%ROWTYPE;
  v_member_exists boolean;
BEGIN
  SELECT * INTO v_base FROM territory_bases WHERE id = p_base_id;

  IF v_base.controlling_gang_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta base no tiene dueño');
  END IF;

  SELECT EXISTS(SELECT 1 FROM gang_members WHERE gang_id = v_base.controlling_gang_id AND user_id = auth.uid()) INTO v_member_exists;
  IF NOT v_member_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'No eres miembro de la gang que controla esta base');
  END IF;

  IF v_base.hp >= v_base.max_hp THEN
    RETURN jsonb_build_object('success', false, 'message', 'La base ya tiene vida máxima');
  END IF;

  UPDATE territory_bases SET hp = LEAST(max_hp, hp + 1) WHERE id = p_base_id;
  RETURN jsonb_build_object('success', true, 'new_hp', LEAST(v_base.max_hp, v_base.hp + 1));
END;
$$;

-- New function: enter base as defender
CREATE OR REPLACE FUNCTION public.enter_base(p_base_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_base territory_bases%ROWTYPE;
  v_member_exists boolean;
  v_user_name text;
BEGIN
  SELECT * INTO v_base FROM territory_bases WHERE id = p_base_id FOR UPDATE;

  IF v_base.controlling_gang_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Esta base no tiene dueño');
  END IF;

  SELECT EXISTS(SELECT 1 FROM gang_members WHERE gang_id = v_base.controlling_gang_id AND user_id = auth.uid()) INTO v_member_exists;
  IF NOT v_member_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'No eres miembro de la gang que controla esta base');
  END IF;

  -- Check respawn cooldown
  IF v_base.defender_id = auth.uid() AND v_base.defender_respawn_at IS NOT NULL AND v_base.defender_respawn_at > now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Debes esperar para volver a entrar', 'respawn_at', v_base.defender_respawn_at::text);
  END IF;

  SELECT COALESCE(display_name, username, 'Usuario') INTO v_user_name FROM profiles WHERE id = auth.uid();

  UPDATE territory_bases SET defender_id = auth.uid(), defender_hp = 5, defender_max_hp = 5, defender_respawn_at = NULL WHERE id = p_base_id;
  RETURN jsonb_build_object('success', true, 'defender_name', v_user_name);
END;
$$;

-- New function: leave base as defender
CREATE OR REPLACE FUNCTION public.leave_base(p_base_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE territory_bases SET defender_id = NULL, defender_hp = 5, defender_respawn_at = NULL 
  WHERE id = p_base_id AND defender_id = auth.uid();
  RETURN jsonb_build_object('success', true);
END;
$$;
