-- Allow admins to insert bases
CREATE POLICY "Admins can create bases" ON public.territory_bases FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
-- Allow admins to update bases
CREATE POLICY "Admins can update bases" ON public.territory_bases FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
-- Allow admins to delete bases
CREATE POLICY "Admins can delete bases" ON public.territory_bases FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));