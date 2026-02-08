
-- Create storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public) VALUES ('announcements', 'announcements', true);

-- Allow authenticated users to view announcement images
CREATE POLICY "Announcement images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcements');

-- Allow admins to upload announcement images
CREATE POLICY "Admins can upload announcement images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'announcements' AND auth.uid() IS NOT NULL);

-- Allow admins to delete announcement images
CREATE POLICY "Admins can delete announcement images"
ON storage.objects FOR DELETE
USING (bucket_id = 'announcements' AND auth.uid() IS NOT NULL);
