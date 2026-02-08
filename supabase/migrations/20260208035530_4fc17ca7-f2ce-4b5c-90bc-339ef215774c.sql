
-- Fix: conversation_participants SELECT policy causes infinite recursion
-- because it references itself. Replace with a security definer function.

-- Step 1: Create a helper function that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
  );
$$;

-- Step 2: Drop the recursive SELECT policy
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

-- Step 3: Create a non-recursive SELECT policy using the helper function
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
USING (is_conversation_participant(conversation_id, auth.uid()));

-- Step 4: Also fix the INSERT policy that may cause similar issues
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;

CREATE POLICY "Users can add participants"
ON public.conversation_participants
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR is_conversation_participant(conversation_id, auth.uid())
);

-- Step 5: Fix the messages SELECT policy which also references conversation_participants
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;

CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (is_conversation_participant(conversation_id, auth.uid()));

-- Step 6: Fix the messages INSERT policy
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

CREATE POLICY "Users can send messages to their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND is_conversation_participant(conversation_id, auth.uid())
);

-- Step 7: Fix conversations SELECT policy
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (is_conversation_participant(id, auth.uid()));

-- Step 8: Fix conversations UPDATE policy
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;

CREATE POLICY "Participants can update conversations"
ON public.conversations
FOR UPDATE
USING (is_conversation_participant(id, auth.uid()));
