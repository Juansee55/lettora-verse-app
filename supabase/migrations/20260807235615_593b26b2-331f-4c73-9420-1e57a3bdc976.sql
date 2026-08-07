ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hide_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hide_birth_date boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hide_reading_activity boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_online_status boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS searchable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_mentions boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_tags boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS admin_hide_identity boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  version text NOT NULL DEFAULT '1.0',
  is_published boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.legal_documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_documents TO authenticated;
GRANT ALL ON public.legal_documents TO service_role;

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published legal documents are public"
  ON public.legal_documents FOR SELECT
  USING (is_published OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage legal documents insert"
  ON public.legal_documents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage legal documents update"
  ON public.legal_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage legal documents delete"
  ON public.legal_documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.privacy_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  target_user_id uuid,
  action text NOT NULL,
  entity_type text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.privacy_audit_log TO authenticated;
GRANT ALL ON public.privacy_audit_log TO service_role;

ALTER TABLE public.privacy_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view privacy audit log"
  ON public.privacy_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can write privacy audit log"
  ON public.privacy_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

INSERT INTO public.legal_documents (slug, title, content)
VALUES (
  'privacy-policy',
  'Política de Privacidad',
  E'## 1. Qué datos recopilamos\nCorreo electrónico, nombre de usuario, contenido que publicas (libros, microrrelatos, comentarios) y datos técnicos básicos de uso.\n\n## 2. Para qué los usamos\nPara ofrecerte la experiencia de lectura y escritura de Lettora, personalizar recomendaciones, moderar contenido y mantener la seguridad de la comunidad.\n\n## 3. Con quién los compartimos\nNo vendemos tus datos. Solo se comparten con proveedores de infraestructura necesarios para operar la aplicación.\n\n## 4. Tus derechos\nPuedes ver, editar, exportar o eliminar tu cuenta y tus datos en cualquier momento desde Ajustes › Privacidad.\n\n## 5. Privacidad de menores\nLettora no está dirigida a menores de 13 años.\n\n## 6. Administradores\nEl acceso administrativo a datos de usuarios queda registrado en un historial de auditoría interno.\n\n## 7. Contacto\nEscríbenos desde la sección de Ayuda de la aplicación.'::text
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.legal_documents (slug, title, content)
VALUES (
  'terms',
  'Términos y Condiciones',
  E'## 1. Uso de Lettora\nAl usar Lettora aceptas publicar únicamente contenido del que tengas derechos.\n\n## 2. Contenido prohibido\nNo se permite contenido ilegal, de odio, acoso ni material sexual con menores.\n\n## 3. Moderación\nLettora puede eliminar contenido o suspender cuentas que incumplan estas normas.\n\n## 4. Cambios\nEstos términos pueden actualizarse; te avisaremos dentro de la aplicación.'::text
) ON CONFLICT (slug) DO NOTHING;