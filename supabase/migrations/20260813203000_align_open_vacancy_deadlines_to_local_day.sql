-- Align existing open vacancies normalized at 23:59 UTC with the end of their
-- selected calendar day in Lettora's operating timezone (America/Montevideo).
UPDATE public.staff_vacancies
SET closes_at = (
  date_trunc('day', closes_at AT TIME ZONE 'America/Montevideo')
  + interval '1 day'
  - interval '1 millisecond'
) AT TIME ZONE 'America/Montevideo'
WHERE status = 'open'
  AND closes_at IS NOT NULL
  AND (closes_at AT TIME ZONE 'UTC')::time = time '23:59:59.999';
