
-- Allow admins/owners to delete participants (kick)
CREATE POLICY "Admins can remove participants"
ON public.conversation_participants
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.role IN ('admin', 'owner')
  )
);

-- Allow message senders to delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
USING (sender_id = auth.uid());

-- Allow group admins to delete any message in their conversations
CREATE POLICY "Admins can delete messages in their conversations"
ON public.messages
FOR DELETE
USING (
  is_conversation_participant(conversation_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.role IN ('admin', 'owner')
  )
);
