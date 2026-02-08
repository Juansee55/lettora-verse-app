
-- Add group settings columns to conversations
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS pinned_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slow_mode_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_only_messages boolean NOT NULL DEFAULT false;

-- Create index for public groups discovery
CREATE INDEX IF NOT EXISTS idx_conversations_is_public ON public.conversations(is_public) WHERE is_public = true;

-- Allow authenticated users to view public groups
CREATE POLICY "Anyone can view public groups"
ON public.conversations
FOR SELECT
USING (is_public = true AND auth.uid() IS NOT NULL);
