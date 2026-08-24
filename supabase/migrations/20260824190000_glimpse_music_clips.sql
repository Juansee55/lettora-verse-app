-- Mantiene el intervalo musical acotado aunque un cliente altere el payload.
ALTER TABLE public.stories
  DROP CONSTRAINT IF EXISTS stories_music_clip_duration_check,
  ADD CONSTRAINT stories_music_clip_duration_check CHECK (
    music IS NULL
    OR (
      jsonb_typeof(music) = 'object'
      AND CASE
        WHEN NOT (music ? 'clip_duration_seconds') THEN true
        WHEN (music->>'clip_duration_seconds') ~ '^([0-9]+)(\\.[0-9]+)?$'
          THEN (music->>'clip_duration_seconds')::numeric BETWEEN 5 AND 30
        ELSE false
      END
      AND CASE
        WHEN NOT (music ? 'start') THEN true
        WHEN (music->>'start') ~ '^([0-9]+)(\\.[0-9]+)?$'
          THEN (music->>'start')::numeric >= 0
        ELSE false
      END
    )
  );
