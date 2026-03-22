
-- Add is_npc flag to gangs table for bot-created gangs
ALTER TABLE public.gangs ADD COLUMN IF NOT EXISTS is_npc boolean NOT NULL DEFAULT false;

-- Add is_bot flag to gang_members for bot members
ALTER TABLE public.gang_members ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;

-- Allow service role to create NPC gangs (update RLS)
CREATE POLICY "Service can create NPC gangs"
ON public.gangs FOR INSERT
TO authenticated
WITH CHECK (
  is_npc = false OR has_role(auth.uid(), 'admin'::app_role)
);

-- Allow service to add bot members
CREATE POLICY "Service can add bot members"
ON public.gang_members FOR INSERT
TO authenticated
WITH CHECK (
  is_bot = false OR has_role(auth.uid(), 'admin'::app_role)
);

-- Function to add a helper bot to user's gang
CREATE OR REPLACE FUNCTION public.add_helper_bot(p_gang_id uuid, p_bot_name text DEFAULT 'Bot Helper')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_member boolean;
  v_bot_count integer;
  v_member_count integer;
  v_balance integer;
BEGIN
  -- Check user is a member of this gang
  SELECT EXISTS(SELECT 1 FROM gang_members WHERE gang_id = p_gang_id AND user_id = v_user_id)
  INTO v_is_member;
  
  IF NOT v_is_member THEN
    RETURN jsonb_build_object('success', false, 'message', 'No eres miembro de esta gang');
  END IF;

  -- Count existing bot members in this gang
  SELECT COUNT(*) INTO v_bot_count
  FROM gang_members WHERE gang_id = p_gang_id AND is_bot = true;
  
  IF v_bot_count >= 5 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Máximo 5 bots por gang');
  END IF;

  -- Count total members
  SELECT COUNT(*) INTO v_member_count
  FROM gang_members WHERE gang_id = p_gang_id;
  
  IF v_member_count >= 25 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Gang llena (25 miembros)');
  END IF;

  -- Check coins
  SELECT balance INTO v_balance FROM user_coins WHERE user_id = v_user_id;
  IF COALESCE(v_balance, 0) < 50 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Necesitas 50 monedas');
  END IF;

  -- Deduct coins
  UPDATE user_coins SET balance = balance - 50, updated_at = now() WHERE user_id = v_user_id;
  INSERT INTO coin_transactions (user_id, amount, transaction_type, description)
  VALUES (v_user_id, -50, 'bot_purchase', 'Bot helper para gang');

  -- Add bot as gang member
  INSERT INTO gang_members (gang_id, user_id, is_leader, is_bot)
  VALUES (p_gang_id, v_user_id, false, true);

  -- Also create a user_bot record
  INSERT INTO user_bots (user_id, gang_id, bot_name, is_active)
  VALUES (v_user_id, p_gang_id, p_bot_name, true);

  RETURN jsonb_build_object('success', true, 'message', 'Bot añadido a la gang');
END;
$$;
