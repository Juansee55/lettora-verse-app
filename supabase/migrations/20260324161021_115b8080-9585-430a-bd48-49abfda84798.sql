
-- Add bonus_hours to gangs for admin-adjustable persistent hours
ALTER TABLE public.gangs ADD COLUMN IF NOT EXISTS bonus_hours numeric NOT NULL DEFAULT 0;

-- Function for admin to adjust gang hours
CREATE OR REPLACE FUNCTION public.admin_adjust_gang_hours(p_gang_id uuid, p_hours numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.gangs SET bonus_hours = GREATEST(0, bonus_hours + p_hours) WHERE id = p_gang_id;
END;
$$;

-- Function for admin to attack base as any gang (bypasses membership check)
CREATE OR REPLACE FUNCTION public.admin_capture_base(p_base_id uuid, p_gang_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_base territory_bases%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'message', 'No autorizado');
  END IF;
  
  SELECT * INTO v_base FROM territory_bases WHERE id = p_base_id FOR UPDATE;
  IF v_base.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Base no encontrada');
  END IF;
  
  -- End current control history
  IF v_base.controlling_gang_id IS NOT NULL THEN
    UPDATE base_control_history SET ended_at = now() WHERE base_id = p_base_id AND ended_at IS NULL;
  END IF;
  
  -- Capture base
  UPDATE territory_bases SET hp = 5, controlling_gang_id = p_gang_id, controlled_since = now(), defender_id = NULL, defender_hp = 5, defender_respawn_at = NULL WHERE id = p_base_id;
  INSERT INTO base_control_history (base_id, gang_id) VALUES (p_base_id, p_gang_id);
  
  RETURN jsonb_build_object('success', true, 'message', 'Base capturada por admin');
END;
$$;
