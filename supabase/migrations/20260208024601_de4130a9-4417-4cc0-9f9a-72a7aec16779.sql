
-- Add foreign key from posts.user_id to profiles.id so we can join them
ALTER TABLE public.posts 
ADD CONSTRAINT posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add is_private column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;
