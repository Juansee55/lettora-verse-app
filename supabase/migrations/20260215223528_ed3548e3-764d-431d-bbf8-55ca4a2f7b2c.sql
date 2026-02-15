
-- Staff contracts table
CREATE TABLE public.staff_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  form_link TEXT,
  cover_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.staff_contracts ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view active contracts
CREATE POLICY "Active contracts viewable by authenticated" ON public.staff_contracts
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Admins can manage contracts
CREATE POLICY "Admins can create contracts" ON public.staff_contracts
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update contracts" ON public.staff_contracts
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete contracts" ON public.staff_contracts
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all contracts (including inactive)
CREATE POLICY "Admins view all contracts" ON public.staff_contracts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
