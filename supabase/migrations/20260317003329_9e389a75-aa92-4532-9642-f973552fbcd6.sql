
-- User badges table (insignias que van junto al nombre)
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '⭐',
  description text,
  badge_type text NOT NULL DEFAULT 'custom',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

-- User equipped badges (qué insignias tiene cada usuario)
CREATE TABLE public.user_equipped_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.user_badges(id) ON DELETE CASCADE,
  equipped_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Event elimination rounds
CREATE TABLE public.event_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  round_number integer NOT NULL DEFAULT 1,
  title text NOT NULL DEFAULT 'Ronda',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(event_id, round_number)
);

-- Participants in each round (who advances)
CREATE TABLE public.event_round_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.event_rounds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  eliminated_at timestamp with time zone,
  UNIQUE(round_id, user_id)
);

-- RLS for user_badges
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges viewable by everyone" ON public.user_badges
  FOR SELECT USING (true);

CREATE POLICY "Admins can create badges" ON public.user_badges
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update badges" ON public.user_badges
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete badges" ON public.user_badges
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS for user_equipped_badges
ALTER TABLE public.user_equipped_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipped badges viewable by everyone" ON public.user_equipped_badges
  FOR SELECT USING (true);

CREATE POLICY "Users can equip badges" ON public.user_equipped_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unequip badges" ON public.user_equipped_badges
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage equipped badges" ON public.user_equipped_badges
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete equipped badges" ON public.user_equipped_badges
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS for event_rounds
ALTER TABLE public.event_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rounds viewable by authenticated" ON public.event_rounds
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can create rounds" ON public.event_rounds
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update rounds" ON public.event_rounds
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete rounds" ON public.event_rounds
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS for event_round_participants
ALTER TABLE public.event_round_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Round participants viewable by authenticated" ON public.event_round_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage round participants" ON public.event_round_participants
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update round participants" ON public.event_round_participants
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete round participants" ON public.event_round_participants
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Also add UPDATE policy for book_collaborators (needed for accepting invitations)
CREATE POLICY "Collaborators can accept invitations" ON public.book_collaborators
  FOR UPDATE USING (auth.uid() = user_id);
