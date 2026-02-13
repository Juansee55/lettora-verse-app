
-- Add admin_title column to user_roles for custom titles/cargos
ALTER TABLE public.user_roles ADD COLUMN admin_title text;

-- Allow admins to update roles (to set titles)
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
