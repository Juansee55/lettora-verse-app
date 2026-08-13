-- Safe, bounded maintenance for Lettora.
-- Published content, profiles, messages, books, chapters and referenced media are never deleted here.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

CREATE TABLE IF NOT EXISTS public.maintenance_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL DEFAULT 'daily_cleanup',
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  database_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  storage_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text
);

ALTER TABLE public.maintenance_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.maintenance_runs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.maintenance_runs TO service_role;

CREATE TABLE IF NOT EXISTS public.maintenance_locks (
  key text PRIMARY KEY,
  locked_until timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.maintenance_locks FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.maintenance_locks TO service_role;

CREATE INDEX IF NOT EXISTS idx_notifications_read_cleanup
  ON public.notifications (read_at)
  WHERE read_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_cleanup
  ON public.user_sessions (last_seen)
  WHERE revoked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bot_attack_log_cleanup
  ON public.bot_attack_log (attacked_at);
CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_cleanup
  ON public.privacy_audit_log (created_at);

CREATE OR REPLACE FUNCTION public.claim_maintenance_slot(
  p_key text,
  p_cooldown interval DEFAULT interval '22 hours'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed boolean := false;
BEGIN
  INSERT INTO public.maintenance_locks (key, locked_until, updated_at)
  VALUES (p_key, now() + p_cooldown, now())
  ON CONFLICT (key) DO UPDATE
    SET locked_until = now() + p_cooldown,
        updated_at = now()
    WHERE public.maintenance_locks.locked_until <= now()
  RETURNING true INTO claimed;

  RETURN COALESCE(claimed, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.run_database_maintenance(
  p_batch_size integer DEFAULT 1000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notifications integer := 0;
  v_sessions integer := 0;
  v_bot_logs integer := 0;
  v_privacy_logs integer := 0;
BEGIN
  IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 5000 THEN
    RAISE EXCEPTION 'p_batch_size must be between 1 and 5000';
  END IF;

  WITH candidates AS (
    SELECT id
    FROM public.notifications
    WHERE read_at IS NOT NULL
      AND read_at < now() - interval '90 days'
    ORDER BY read_at
    LIMIT p_batch_size
  ), removed AS (
    DELETE FROM public.notifications
    WHERE id IN (SELECT id FROM candidates)
    RETURNING id
  )
  SELECT count(*) INTO v_notifications FROM removed;

  WITH candidates AS (
    SELECT id
    FROM public.user_sessions
    WHERE revoked_at IS NOT NULL
      AND COALESCE(last_seen, revoked_at, created_at) < now() - interval '180 days'
    ORDER BY COALESCE(last_seen, revoked_at, created_at)
    LIMIT p_batch_size
  ), removed AS (
    DELETE FROM public.user_sessions
    WHERE id IN (SELECT id FROM candidates)
    RETURNING id
  )
  SELECT count(*) INTO v_sessions FROM removed;

  WITH candidates AS (
    SELECT id
    FROM public.bot_attack_log
    WHERE attacked_at < now() - interval '180 days'
    ORDER BY attacked_at
    LIMIT p_batch_size
  ), removed AS (
    DELETE FROM public.bot_attack_log
    WHERE id IN (SELECT id FROM candidates)
    RETURNING id
  )
  SELECT count(*) INTO v_bot_logs FROM removed;

  WITH candidates AS (
    SELECT id
    FROM public.privacy_audit_log
    WHERE created_at < now() - interval '365 days'
    ORDER BY created_at
    LIMIT p_batch_size
  ), removed AS (
    DELETE FROM public.privacy_audit_log
    WHERE id IN (SELECT id FROM candidates)
    RETURNING id
  )
  SELECT count(*) INTO v_privacy_logs FROM removed;

  RETURN jsonb_build_object(
    'notifications_read_over_90_days', v_notifications,
    'revoked_sessions_over_180_days', v_sessions,
    'bot_attack_logs_over_180_days', v_bot_logs,
    'privacy_audit_logs_over_365_days', v_privacy_logs
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_maintenance_slot(text, interval) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_database_maintenance(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_maintenance_slot(text, interval) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_database_maintenance(integer) TO service_role;

-- The function call is authenticated by the project publishable key stored encrypted in Vault.
-- The Edge Function has a 22-hour database lock, so duplicate external calls cannot run repeated cleanup.
SELECT vault.create_secret('https://fbdqquairrehiyzrwopt.supabase.co', 'lettora_project_url')
WHERE NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'lettora_project_url');

SELECT vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZHFxdWFpcnJlaGl5enJ3b3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MzU5ODcsImV4cCI6MjEwMjIxMTk4N30.8WVNDSLbCPVzUa9o2juLs00hUEET7h9nolQ7kvZ-NSc', 'lettora_publishable_key')
WHERE NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'lettora_publishable_key');

DO $$
DECLARE
  existing_job bigint;
BEGIN
  SELECT jobid INTO existing_job FROM cron.job WHERE jobname = 'lettora-daily-maintenance' LIMIT 1;
  IF existing_job IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job);
  END IF;
END;
$$;

SELECT cron.schedule(
  'lettora-daily-maintenance',
  '15 3 * * *',
  $job$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'lettora_project_url') || '/functions/v1/maintenance-cleanup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'lettora_publishable_key')
      ),
      body := jsonb_build_object('source', 'scheduled')
    );
  $job$
);
