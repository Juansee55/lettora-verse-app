-- Staff recruitment, manual review and safe administration controls for Lettora.
-- This migration intentionally does not elevate approved applicants to the `admin` role.

CREATE TABLE IF NOT EXISTS public.staff_vacancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (title IN (
    'Head Moderator',
    'Moderator',
    'Content Manager',
    'Community Ambassador',
    'Support Manager',
    'Events Manager',
    'Design Manager',
    'Trust & Safety Coordinator',
    'Beta Reader Coordinator'
  )),
  team text NOT NULL CHECK (team IN ('Moderación', 'Contenido', 'Comunidad', 'Soporte', 'Eventos', 'Diseño', 'Trust & Safety', 'Lectura beta')),
  description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 30 AND 4000),
  requirements text,
  openings integer NOT NULL DEFAULT 1 CHECK (openings BETWEEN 1 AND 25),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  closes_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id uuid NOT NULL REFERENCES public.staff_vacancies(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  motivation text NOT NULL CHECK (char_length(trim(motivation)) BETWEEN 40 AND 5000),
  relevant_experience text CHECK (relevant_experience IS NULL OR char_length(relevant_experience) <= 4000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewer_note text CHECK (reviewer_note IS NULL OR char_length(reviewer_note) <= 2000),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vacancy_id, applicant_id)
);

CREATE TABLE IF NOT EXISTS public.staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vacancy_id uuid REFERENCES public.staff_vacancies(id) ON DELETE SET NULL,
  application_id uuid UNIQUE REFERENCES public.staff_applications(id) ON DELETE SET NULL,
  title text NOT NULL,
  team text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  assigned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  note text CHECK (note IS NULL OR char_length(note) <= 1000),
  CONSTRAINT staff_assignment_dates_valid CHECK (ended_at IS NULL OR ended_at >= assigned_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_assignments_one_active_title
  ON public.staff_assignments (user_id, title)
  WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_staff_vacancies_open ON public.staff_vacancies (status, closes_at);
CREATE INDEX IF NOT EXISTS idx_staff_applications_review ON public.staff_applications (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_applications_owner ON public.staff_applications (applicant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_active ON public.staff_assignments (is_active, team);

ALTER TABLE public.staff_vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view open staff vacancies" ON public.staff_vacancies;
CREATE POLICY "Anyone can view open staff vacancies"
  ON public.staff_vacancies FOR SELECT
  USING (status = 'open' AND (closes_at IS NULL OR closes_at > now()));

DROP POLICY IF EXISTS "Admins manage staff vacancies" ON public.staff_vacancies;
CREATE POLICY "Admins manage staff vacancies"
  ON public.staff_vacancies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Applicants view own staff applications" ON public.staff_applications;
CREATE POLICY "Applicants view own staff applications"
  ON public.staff_applications FOR SELECT TO authenticated
  USING (applicant_id = auth.uid());

DROP POLICY IF EXISTS "Applicants create pending applications" ON public.staff_applications;
CREATE POLICY "Applicants create pending applications"
  ON public.staff_applications FOR INSERT TO authenticated
  WITH CHECK (
    applicant_id = auth.uid()
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.staff_vacancies v
      WHERE v.id = vacancy_id
        AND v.status = 'open'
        AND (v.closes_at IS NULL OR v.closes_at > now())
    )
  );

DROP POLICY IF EXISTS "Applicants withdraw own pending applications" ON public.staff_applications;
CREATE POLICY "Applicants withdraw own pending applications"
  ON public.staff_applications FOR UPDATE TO authenticated
  USING (applicant_id = auth.uid() AND status = 'pending')
  WITH CHECK (applicant_id = auth.uid() AND status = 'withdrawn');

DROP POLICY IF EXISTS "Admins review all staff applications" ON public.staff_applications;
CREATE POLICY "Admins review all staff applications"
  ON public.staff_applications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Staff view own assignments" ON public.staff_assignments;
CREATE POLICY "Staff view own assignments"
  ON public.staff_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage staff assignments" ON public.staff_assignments;
CREATE POLICY "Admins manage staff assignments"
  ON public.staff_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.touch_staff_recruitment_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_staff_vacancies_updated_at ON public.staff_vacancies;
CREATE TRIGGER touch_staff_vacancies_updated_at
  BEFORE UPDATE ON public.staff_vacancies
  FOR EACH ROW EXECUTE FUNCTION public.touch_staff_recruitment_updated_at();

DROP TRIGGER IF EXISTS touch_staff_applications_updated_at ON public.staff_applications;
CREATE TRIGGER touch_staff_applications_updated_at
  BEFORE UPDATE ON public.staff_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_staff_recruitment_updated_at();

CREATE OR REPLACE FUNCTION public.review_staff_application(
  p_application_id uuid,
  p_decision text,
  p_reviewer_note text DEFAULT NULL
)
RETURNS public.staff_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application public.staff_applications;
  v_vacancy public.staff_vacancies;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only administrators can review staff applications';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected';
  END IF;

  SELECT * INTO v_application
  FROM public.staff_applications
  WHERE id = p_application_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  IF v_application.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending applications can be reviewed';
  END IF;

  SELECT * INTO v_vacancy FROM public.staff_vacancies WHERE id = v_application.vacancy_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vacancy not found';
  END IF;

  UPDATE public.staff_applications
  SET status = p_decision,
      reviewer_note = NULLIF(trim(COALESCE(p_reviewer_note, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_application_id
  RETURNING * INTO v_application;

  IF p_decision = 'approved' THEN
    INSERT INTO public.staff_assignments (user_id, vacancy_id, application_id, title, team, assigned_by)
    VALUES (v_application.applicant_id, v_vacancy.id, v_application.id, v_vacancy.title, v_vacancy.team, auth.uid())
    ON CONFLICT (application_id) DO NOTHING;
  END IF;

  RETURN v_application;
END;
$$;

REVOKE ALL ON FUNCTION public.review_staff_application(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_staff_application(uuid, text, text) TO authenticated;

-- Staff invisibility is available only to administrators; it hides the profile from public profile reads and team listings.
CREATE OR REPLACE FUNCTION public.protect_admin_identity_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.admin_hide_identity IS DISTINCT FROM OLD.admin_hide_identity
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only administrators may change administrator visibility';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_admin_identity_visibility ON public.profiles;
CREATE TRIGGER protect_admin_identity_visibility
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_admin_identity_visibility();

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles respect staff invisibility" ON public.profiles;
CREATE POLICY "Public profiles respect staff invisibility"
  ON public.profiles FOR SELECT
  USING (
    NOT COALESCE(admin_hide_identity, false)
    OR auth.uid() = id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Administrators can edit or remove uploaded user content when moderation requires it.
DO $$
DECLARE
  t text;
  p text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'books', 'chapters', 'posts', 'literary_posts', 'comments',
    'microstories', 'author_blogs', 'webcomics', 'webcomic_episodes',
    'free_books', 'proposals'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
               WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r') THEN
      p := 'Admins can update ' || t;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = p) THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), ''admin''::public.app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::public.app_role))', p, t);
      END IF;
      p := 'Admins can delete ' || t;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = p) THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(), ''admin''::public.app_role))', p, t);
      END IF;
    END IF;
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Admins manage all uploaded media" ON storage.objects;
CREATE POLICY "Admins manage all uploaded media"
  ON storage.objects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Staff directory uses assignments and honours identity invisibility.
CREATE OR REPLACE FUNCTION public.get_public_staff()
RETURNS TABLE (
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  title text,
  team text,
  assigned_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url, sa.title, sa.team, sa.assigned_at
  FROM public.staff_assignments sa
  JOIN public.profiles p ON p.id = sa.user_id
  WHERE sa.is_active = true
    AND (
      COALESCE(p.admin_hide_identity, false) = false
      OR auth.uid() = p.id
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  ORDER BY sa.team, sa.title, COALESCE(p.display_name, p.username, '');
$$;
REVOKE ALL ON FUNCTION public.get_public_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_staff() TO anon, authenticated;
