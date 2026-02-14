
-- User experience/levels table
CREATE TABLE public.user_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Levels viewable by everyone" ON public.user_levels FOR SELECT USING (true);
CREATE POLICY "System manages levels" ON public.user_levels FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "System updates levels" ON public.user_levels FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Function to calculate level from XP
CREATE OR REPLACE FUNCTION public.calculate_level(p_xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF p_xp >= 2000 THEN RETURN 21;
  ELSIF p_xp >= 1000 THEN RETURN 11 + ((p_xp - 1000) / 100);
  ELSIF p_xp >= 300 THEN RETURN 6 + ((p_xp - 300) / 140);
  ELSE RETURN 1 + (p_xp / 60);
  END IF;
END;
$$;

-- Award XP function
CREATE OR REPLACE FUNCTION public.award_xp(p_user_id UUID, p_amount INTEGER)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_new_xp INTEGER;
BEGIN
  INSERT INTO public.user_levels (user_id, xp, level)
  VALUES (p_user_id, p_amount, calculate_level(p_amount))
  ON CONFLICT (user_id) DO UPDATE
  SET xp = user_levels.xp + p_amount,
      level = calculate_level(user_levels.xp + p_amount),
      updated_at = now();
END;
$$;

-- Trigger: XP on publish microstory (10 XP)
CREATE OR REPLACE FUNCTION public.award_xp_on_microstory()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM award_xp(NEW.author_id, 10);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_xp_microstory
AFTER INSERT ON public.microstories
FOR EACH ROW EXECUTE FUNCTION public.award_xp_on_microstory();

-- Trigger: XP on receive like (5 XP to content owner)
CREATE OR REPLACE FUNCTION public.award_xp_on_like_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_owner_id UUID;
BEGIN
  IF NEW.likeable_type = 'book' THEN
    SELECT author_id INTO v_owner_id FROM public.books WHERE id = NEW.likeable_id;
  ELSIF NEW.likeable_type = 'microstory' THEN
    SELECT author_id INTO v_owner_id FROM public.microstories WHERE id = NEW.likeable_id;
  ELSIF NEW.likeable_type = 'post' THEN
    SELECT user_id INTO v_owner_id FROM public.posts WHERE id = NEW.likeable_id;
  END IF;
  IF v_owner_id IS NOT NULL AND v_owner_id != NEW.user_id THEN
    PERFORM award_xp(v_owner_id, 5);
  END IF;
  -- Also give 2 XP to the liker
  PERFORM award_xp(NEW.user_id, 2);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_xp_like
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.award_xp_on_like_received();

-- Trigger: XP on comment (3 XP)
CREATE OR REPLACE FUNCTION public.award_xp_on_comment_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM award_xp(NEW.user_id, 3);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_xp_comment
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.award_xp_on_comment_xp();

-- Trigger: XP on post (8 XP)
CREATE OR REPLACE FUNCTION public.award_xp_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM award_xp(NEW.user_id, 8);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_xp_post
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.award_xp_on_post();

-- Trigger: XP on new follower (3 XP to followed user)
CREATE OR REPLACE FUNCTION public.award_xp_on_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM award_xp(NEW.following_id, 3);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_xp_follow
AFTER INSERT ON public.followers
FOR EACH ROW EXECUTE FUNCTION public.award_xp_on_follow();
