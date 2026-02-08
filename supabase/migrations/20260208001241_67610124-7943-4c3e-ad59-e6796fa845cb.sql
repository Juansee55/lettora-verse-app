
-- Reports table for flagging inappropriate content
CREATE TABLE public.content_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  content_type TEXT NOT NULL, -- 'microstory' or 'book'
  content_id UUID NOT NULL,
  reason TEXT NOT NULL, -- 'spam', 'harassment', 'inappropriate', 'copyright', 'other'
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports (authenticated)
CREATE POLICY "Users can create reports"
ON public.content_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
ON public.content_reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.content_reports
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update reports (resolve/dismiss)
CREATE POLICY "Admins can update reports"
ON public.content_reports
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete reports
CREATE POLICY "Admins can delete reports"
ON public.content_reports
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast admin queries
CREATE INDEX idx_content_reports_status ON public.content_reports(status);
CREATE INDEX idx_content_reports_content ON public.content_reports(content_type, content_id);
