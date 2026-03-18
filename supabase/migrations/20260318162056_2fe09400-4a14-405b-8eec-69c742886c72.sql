
-- Gangs table
CREATE TABLE public.gangs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  photo_url text,
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gangs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gangs viewable by authenticated" ON public.gangs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create gangs" ON public.gangs FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update gangs" ON public.gangs FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete gangs" ON public.gangs FOR DELETE USING (auth.uid() = created_by);

-- Gang members (max 25 enforced in app)
CREATE TABLE public.gang_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gang_id uuid NOT NULL REFERENCES public.gangs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_leader boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(gang_id, user_id)
);
ALTER TABLE public.gang_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members viewable by authenticated" ON public.gang_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join gangs" ON public.gang_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave gangs" ON public.gang_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Leaders can remove members" ON public.gang_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.gang_members gm WHERE gm.gang_id = gang_members.gang_id AND gm.user_id = auth.uid() AND gm.is_leader = true)
);

-- Gang allies (max 5 enforced in app)
CREATE TABLE public.gang_allies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gang_id uuid NOT NULL REFERENCES public.gangs(id) ON DELETE CASCADE,
  allied_gang_id uuid NOT NULL REFERENCES public.gangs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(gang_id, allied_gang_id)
);
ALTER TABLE public.gang_allies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allies viewable by authenticated" ON public.gang_allies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gang creators can add allies" ON public.gang_allies FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.gangs WHERE id = gang_allies.gang_id AND created_by = auth.uid())
);
CREATE POLICY "Gang creators can remove allies" ON public.gang_allies FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.gangs WHERE id = gang_allies.gang_id AND created_by = auth.uid())
);

-- Territory bases (12 fixed)
CREATE TABLE public.territory_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_number int NOT NULL UNIQUE,
  name text NOT NULL,
  hp int NOT NULL DEFAULT 50,
  max_hp int NOT NULL DEFAULT 50,
  controlling_gang_id uuid REFERENCES public.gangs(id) ON DELETE SET NULL,
  controlled_since timestamptz
);
ALTER TABLE public.territory_bases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bases viewable by authenticated" ON public.territory_bases FOR SELECT TO authenticated USING (true);

-- Base control history for leaderboard
CREATE TABLE public.base_control_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id uuid NOT NULL REFERENCES public.territory_bases(id) ON DELETE CASCADE,
  gang_id uuid NOT NULL REFERENCES public.gangs(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
ALTER TABLE public.base_control_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "History viewable by authenticated" ON public.base_control_history FOR SELECT TO authenticated USING (true);

-- Base attack log
CREATE TABLE public.base_attacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id uuid NOT NULL REFERENCES public.territory_bases(id) ON DELETE CASCADE,
  attacker_id uuid NOT NULL,
  attacker_gang_id uuid NOT NULL REFERENCES public.gangs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.base_attacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attacks viewable by authenticated" ON public.base_attacks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can log attacks" ON public.base_attacks FOR INSERT WITH CHECK (auth.uid() = attacker_id);

-- Seed 12 bases
INSERT INTO public.territory_bases (base_number, name) VALUES
  (1, 'Base Alpha'), (2, 'Base Bravo'), (3, 'Base Charlie'), (4, 'Base Delta'),
  (5, 'Base Echo'), (6, 'Base Foxtrot'), (7, 'Base Golf'), (8, 'Base Hotel'),
  (9, 'Base India'), (10, 'Base Juliet'), (11, 'Base Kilo'), (12, 'Base Lima');

-- Function to attack a base (does 1 damage)
CREATE OR REPLACE FUNCTION public.attack_base(p_base_id uuid, p_attacker_gang_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base territory_bases%ROWTYPE;
  v_member_exists boolean;
  v_new_hp int;
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

  v_new_hp := GREATEST(0, v_base.hp - 1);

  INSERT INTO base_attacks (base_id, attacker_id, attacker_gang_id) VALUES (p_base_id, auth.uid(), p_attacker_gang_id);

  IF v_new_hp = 0 THEN
    IF v_base.controlling_gang_id IS NOT NULL THEN
      UPDATE base_control_history SET ended_at = now() WHERE base_id = p_base_id AND ended_at IS NULL;
    END IF;
    UPDATE territory_bases SET hp = 50, controlling_gang_id = p_attacker_gang_id, controlled_since = now() WHERE id = p_base_id;
    INSERT INTO base_control_history (base_id, gang_id) VALUES (p_base_id, p_attacker_gang_id);
    RETURN jsonb_build_object('success', true, 'captured', true, 'new_hp', 50);
  ELSE
    UPDATE territory_bases SET hp = v_new_hp WHERE id = p_base_id;
    RETURN jsonb_build_object('success', true, 'captured', false, 'new_hp', v_new_hp);
  END IF;
END;
$$;

-- Function to heal a base (+1 hp, only controlling gang)
CREATE OR REPLACE FUNCTION public.heal_base(p_base_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
