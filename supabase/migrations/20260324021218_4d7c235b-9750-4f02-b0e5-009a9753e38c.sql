
-- Add milestone_hours to gang_reward_claims so claims track which milestone they belong to
ALTER TABLE public.gang_reward_claims ADD COLUMN IF NOT EXISTS milestone_hours integer NOT NULL DEFAULT 2000;
