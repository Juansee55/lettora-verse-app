
-- Add level_reward column to profile_items to mark items as level rewards
ALTER TABLE public.profile_items ADD COLUMN IF NOT EXISTS level_required INTEGER DEFAULT NULL;

-- Insert level reward items: frames for each rank transition
INSERT INTO public.profile_items (name, item_type, rarity, price, image_url, css_value, level_required, description) VALUES
-- Lector rewards (levels 1-5)
('Marco Lector', 'frame', 'common', 0, '📖', 'border-4 border-emerald-400', 2, 'Recompensa por alcanzar nivel 2'),
('Verde Lector', 'name_color', 'common', 0, '📖', 'text-emerald-500', 3, 'Color de nombre por alcanzar nivel 3'),

-- Autor rewards (levels 6-10)  
('Marco Autor', 'frame', 'rare', 0, '✍️', 'border-4 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.4)]', 6, 'Recompensa por alcanzar rango Autor'),
('Azul Autor', 'name_color', 'rare', 0, '✍️', 'text-blue-500', 7, 'Color de nombre por alcanzar nivel 7'),
('Marco Tinta', 'frame', 'rare', 0, '✍️', 'border-4 border-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]', 9, 'Recompensa por alcanzar nivel 9'),

-- Creador rewards (levels 11-20)
('Marco Creador', 'frame', 'epic', 0, '🌟', 'border-4 border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.5)]', 11, 'Recompensa por alcanzar rango Creador'),
('Dorado Creador', 'name_color', 'epic', 0, '🌟', 'text-amber-500', 12, 'Color dorado por alcanzar nivel 12'),
('Marco Estelar', 'frame', 'epic', 0, '🌟', 'border-4 border-transparent bg-gradient-to-r from-amber-400 via-orange-500 to-red-500', 15, 'Recompensa por alcanzar nivel 15'),
('Fuego Creador', 'name_color', 'epic', 0, '🌟', 'bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent', 18, 'Color fuego por alcanzar nivel 18'),

-- Maestro narrativo rewards (level 21+)
('Marco Maestro', 'frame', 'legendary', 0, '🏆', 'border-4 border-transparent bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.6)]', 21, 'Recompensa legendaria por alcanzar Maestro narrativo'),
('Arcoíris Maestro', 'name_color', 'legendary', 0, '🏆', 'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent', 21, 'Color arcoíris legendario');

-- Create function to grant level rewards automatically
CREATE OR REPLACE FUNCTION public.grant_level_rewards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reward RECORD;
BEGIN
  -- Only trigger when level increases
  IF NEW.level > OLD.level THEN
    -- Find all reward items for levels between old+1 and new level
    FOR reward IN
      SELECT id FROM public.profile_items
      WHERE level_required IS NOT NULL
        AND level_required <= NEW.level
        AND level_required > OLD.level
    LOOP
      -- Grant item if not already owned
      INSERT INTO public.user_items (user_id, item_id)
      VALUES (NEW.user_id, reward.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on user_levels update
CREATE TRIGGER on_level_up_grant_rewards
  AFTER UPDATE ON public.user_levels
  FOR EACH ROW
  WHEN (NEW.level > OLD.level)
  EXECUTE FUNCTION public.grant_level_rewards();

-- Also grant on insert (first time level is set)
CREATE OR REPLACE FUNCTION public.grant_initial_level_rewards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reward RECORD;
BEGIN
  FOR reward IN
    SELECT id FROM public.profile_items
    WHERE level_required IS NOT NULL
      AND level_required <= NEW.level
  LOOP
    INSERT INTO public.user_items (user_id, item_id)
    VALUES (NEW.user_id, reward.id)
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_level_insert_grant_rewards
  AFTER INSERT ON public.user_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_initial_level_rewards();
