-- Evita reevaluar auth.uid() por cada fila en las políticas nuevas.
DROP POLICY IF EXISTS "Approved free books are viewable by everyone" ON public.free_books;
CREATE POLICY "Approved free books are viewable by everyone"
  ON public.free_books FOR SELECT
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR (
      approval_status IN ('approved', 'published')
      AND COALESCE(publish_at, now()) <= now()
    )
  );

DROP POLICY IF EXISTS "Admins manage free book queue" ON public.free_book_ingestion_queue;
CREATE POLICY "Admins manage free book queue"
  ON public.free_book_ingestion_queue FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
