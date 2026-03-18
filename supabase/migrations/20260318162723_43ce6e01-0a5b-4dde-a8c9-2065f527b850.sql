
INSERT INTO storage.buckets (id, name, public) VALUES ('gang-photos', 'gang-photos', true);

CREATE POLICY "Anyone can view gang photos" ON storage.objects FOR SELECT USING (bucket_id = 'gang-photos');
CREATE POLICY "Authenticated can upload gang photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gang-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own gang photos" ON storage.objects FOR DELETE USING (bucket_id = 'gang-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
