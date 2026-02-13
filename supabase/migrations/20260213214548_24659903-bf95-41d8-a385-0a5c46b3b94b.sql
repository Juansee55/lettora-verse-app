
-- Table to track valentine quest completions
CREATE TABLE public.valentine_quest_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  microstory_id UUID REFERENCES public.microstories(id),
  UNIQUE(user_id)
);

ALTER TABLE public.valentine_quest_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quest completion"
  ON public.valentine_quest_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quest completion"
  ON public.valentine_quest_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update check constraint to allow name_color
ALTER TABLE public.profile_items DROP CONSTRAINT profile_items_item_type_check;
ALTER TABLE public.profile_items ADD CONSTRAINT profile_items_item_type_check CHECK (item_type = ANY (ARRAY['frame'::text, 'background'::text, 'name_color'::text]));

-- Insert Valentine exclusive items (price 0 = quest reward only)
INSERT INTO public.profile_items (name, description, item_type, rarity, price, image_url, css_value) VALUES
  ('Marco San Valentín', 'Marco exclusivo del evento de San Valentín 💕', 'frame', 'legendary', 0, '💕', 'valentine-frame'),
  ('Nombre Rosa', 'Tu nombre en rosa con animación brillante 💖', 'name_color', 'legendary', 0, '💖', 'valentine-name-pink');
