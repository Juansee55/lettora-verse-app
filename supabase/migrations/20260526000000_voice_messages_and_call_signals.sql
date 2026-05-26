-- Voice messages and WebRTC call signaling
-- Adds persisted voice duration metadata and a realtime signaling table for direct calls.

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS voice_duration integer;

CREATE TABLE IF NOT EXISTS public.call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  signal_type text NOT NULL CHECK (signal_type IN ('offer', 'answer', 'candidate', 'reject', 'end')),
  signal_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_video boolean NOT NULL DEFAULT false,
  call_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_call_signals_to_user_created
ON public.call_signals (to_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_call_signals_call_id
ON public.call_signals (call_id)
WHERE call_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can view their call signals" ON public.call_signals;
CREATE POLICY "Users can view their call signals"
ON public.call_signals
FOR SELECT
TO authenticated
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "Users can create outbound call signals" ON public.call_signals;
CREATE POLICY "Users can create outbound call signals"
ON public.call_signals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can delete their call signals" ON public.call_signals;
CREATE POLICY "Users can delete their call signals"
ON public.call_signals
FOR DELETE
TO authenticated
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Supabase Realtime listens to INSERT events from this table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'call_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;
  END IF;
END $$;
