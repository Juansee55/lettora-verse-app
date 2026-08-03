ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS admin_bio text,
  ADD COLUMN IF NOT EXISTS role_since date,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS left_at date,
  ADD COLUMN IF NOT EXISTS birth_date date;

GRANT SELECT ON public.user_roles TO anon;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can update team profile info'
  ) THEN
    CREATE POLICY "Admins can update team profile info"
      ON public.user_roles
      FOR UPDATE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;