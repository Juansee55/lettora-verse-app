
-- Gang rooms table for milestone rewards
CREATE TABLE public.gang_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gang_id uuid REFERENCES public.gangs(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Habitación',
  description text,
  theme_css text,
  room_number integer NOT NULL DEFAULT 1,
  milestone_hours integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gang_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms viewable by authenticated" ON public.gang_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leaders can update rooms" ON public.gang_rooms FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM gang_members gm WHERE gm.gang_id = gang_rooms.gang_id AND gm.user_id = auth.uid() AND gm.is_leader = true));

-- Gang milestones tracking table
CREATE TABLE public.gang_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gang_id uuid REFERENCES public.gangs(id) ON DELETE CASCADE NOT NULL,
  milestone_hours integer NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(gang_id, milestone_hours)
);

ALTER TABLE public.gang_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Milestones viewable by authenticated" ON public.gang_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert milestones" ON public.gang_milestones FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM gang_members gm WHERE gm.gang_id = gang_milestones.gang_id AND gm.user_id = auth.uid() AND gm.is_leader = true)
  OR has_role(auth.uid(), 'admin'::app_role)
);
