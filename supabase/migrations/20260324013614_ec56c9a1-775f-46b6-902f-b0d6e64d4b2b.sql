
-- Add rank column to gang_members
ALTER TABLE public.gang_members ADD COLUMN IF NOT EXISTS rank text NOT NULL DEFAULT 'member';

-- Allow leaders to update members (rank, is_leader)
CREATE POLICY "Leaders can update members"
ON public.gang_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gang_members gm
    WHERE gm.gang_id = gang_members.gang_id
    AND gm.user_id = auth.uid()
    AND gm.is_leader = true
  )
);

-- Allow creators to update their gangs (already exists but ensure it covers all fields)
-- The existing "Creators can update gangs" policy already handles this.
