-- A date selected in the admin form represents the complete local calendar day.
-- PostgreSQL stores an HTML date input as midnight UTC; normalize existing same-day
-- open vacancies so RLS does not hide them immediately after they are created.
UPDATE public.staff_vacancies
SET closes_at = date_trunc('day', closes_at) + interval '1 day' - interval '1 millisecond'
WHERE status = 'open'
  AND closes_at IS NOT NULL
  AND closes_at = date_trunc('day', closes_at)
  AND closes_at::date = current_date;
