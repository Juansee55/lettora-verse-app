
-- Bucket for APK / OBB builds (private, admin-only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-builds', 'app-builds', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: only admins can read / write
CREATE POLICY "Admins read app builds"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'app-builds' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins upload app builds"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'app-builds' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update app builds"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'app-builds' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete app builds"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'app-builds' AND public.has_role(auth.uid(), 'admin'));

-- Catalog table for app builds
CREATE TABLE public.app_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('apk','obb')),
  version TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view app builds"
  ON public.app_builds FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert app builds"
  ON public.app_builds FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = uploaded_by);

CREATE POLICY "Admins delete app builds"
  ON public.app_builds FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
