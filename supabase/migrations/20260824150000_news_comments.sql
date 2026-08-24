-- Allow the reusable comments system to target administrator-published news.
ALTER TABLE public.comments
  DROP CONSTRAINT IF EXISTS comments_commentable_type_check;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_commentable_type_check
  CHECK (commentable_type IN ('book', 'chapter', 'microstory', 'post', 'literary_post', 'news'));

CREATE INDEX IF NOT EXISTS comments_news_lookup_idx
  ON public.comments (commentable_type, commentable_id, created_at);

NOTIFY pgrst, 'reload schema';
