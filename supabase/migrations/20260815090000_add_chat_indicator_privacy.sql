-- Chat privacy preferences: each user controls whether other participants can see
-- their typing status and read receipts.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_typing_indicator BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_read_receipts BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.show_typing_indicator IS
  'Whether other participants may see that this user is typing in a conversation.';
COMMENT ON COLUMN public.profiles.show_read_receipts IS
  'Whether other participants may see read confirmations for this user.';

NOTIFY pgrst, 'reload schema';
