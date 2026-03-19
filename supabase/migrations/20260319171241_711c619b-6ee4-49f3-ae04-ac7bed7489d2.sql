
-- Table to track gang reward milestones and claims
CREATE TABLE public.gang_reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gang_id UUID NOT NULL REFERENCES public.gangs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  badge_id UUID REFERENCES public.user_badges(id) ON DELETE SET NULL,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  granted_by UUID, -- admin who approved
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  UNIQUE(gang_id, user_id)
);

ALTER TABLE public.gang_reward_claims ENABLE ROW LEVEL SECURITY;

-- Everyone can view claims
CREATE POLICY "Claims viewable by authenticated" ON public.gang_reward_claims
  FOR SELECT TO authenticated USING (true);

-- Members can insert their own claims
CREATE POLICY "Users can claim rewards" ON public.gang_reward_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can update claims (approve/reject)
CREATE POLICY "Admins can update claims" ON public.gang_reward_claims
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete claims
CREATE POLICY "Admins can delete claims" ON public.gang_reward_claims
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
