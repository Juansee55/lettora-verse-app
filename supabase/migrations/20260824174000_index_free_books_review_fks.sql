-- Índices de soporte para las relaciones de revisión y publicación mensual.
CREATE INDEX IF NOT EXISTS free_book_queue_created_by_idx
  ON public.free_book_ingestion_queue (created_by)
  WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS free_book_queue_reviewed_by_idx
  ON public.free_book_ingestion_queue (reviewed_by)
  WHERE reviewed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS free_book_queue_published_book_id_idx
  ON public.free_book_ingestion_queue (published_book_id)
  WHERE published_book_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS free_books_approved_by_idx
  ON public.free_books (approved_by)
  WHERE approved_by IS NOT NULL;
