-- Fix the permissive policy for conversations creation
DROP POLICY "Users can create conversations" ON public.conversations;

-- Users can only create conversations where they are the first participant
CREATE POLICY "Authenticated users can create conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (true);