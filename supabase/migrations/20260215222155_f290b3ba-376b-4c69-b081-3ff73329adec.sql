
-- Allow admins to delete profiles (for account deletion)
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow users to delete their own profiles
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);

-- Allow admins to delete posts
CREATE POLICY "Admins can delete posts"
ON public.posts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete microstories
CREATE POLICY "Admins can delete microstories"
ON public.microstories
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete books
CREATE POLICY "Admins can delete books"
ON public.books
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
