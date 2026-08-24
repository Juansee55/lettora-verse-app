-- Consolida políticas históricas duplicadas de free_books y evita auth.uid() por fila.
DROP POLICY IF EXISTS "Admins can delete free_books" ON public.free_books;
DROP POLICY IF EXISTS "Admins can update free_books" ON public.free_books;
DROP POLICY IF EXISTS "Admins manage free books - insert" ON public.free_books;
DROP POLICY IF EXISTS "Admins manage free books - update" ON public.free_books;
DROP POLICY IF EXISTS "Admins manage free books - delete" ON public.free_books;

CREATE POLICY "Admins manage free books - insert"
  ON public.free_books FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins manage free books - update"
  ON public.free_books FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins manage free books - delete"
  ON public.free_books FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
