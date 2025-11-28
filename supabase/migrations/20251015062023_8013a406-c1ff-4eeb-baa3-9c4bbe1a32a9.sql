-- Create storage bucket for observation images
INSERT INTO storage.buckets (id, name, public)
VALUES ('observations', 'observations', true);

-- Create policies for observation images
CREATE POLICY "Anyone can view observation images"
ON storage.objects FOR SELECT
USING (bucket_id = 'observations');

CREATE POLICY "Authenticated users can upload observation images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'observations' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own observation images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'observations' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own observation images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'observations' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);