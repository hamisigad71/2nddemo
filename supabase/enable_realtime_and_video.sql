-- 1. Add media_type column to track whether a post is a photo or a video
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';

-- 2. Allow video uploads in your storage bucket
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/*', 'video/mp4', 'video/quicktime', 'video/webm']
WHERE id = 'hideaway post storage';

