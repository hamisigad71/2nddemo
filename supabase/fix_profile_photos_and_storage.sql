-- =========================================================================
-- Comprehensive Profile Photo & Storage Fix for The Gents Dollhouse
-- Resolves the issue where profile photos uploaded by creators/subscribers
-- are not visible to other viewers or fail due to storage RLS / bucket permissions.
--
-- Instructions: Run this script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- =========================================================================

-- 1. Ensure all public media & avatar storage buckets exist and are PUBLIC
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('Daysman Gad', 'Daysman Gad', true, 52428800, ARRAY['image/*', 'video/*']),
  ('avatars', 'avatars', true, 52428800, ARRAY['image/*']),
  ('media', 'media', true, 52428800, ARRAY['image/*', 'video/*'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit;

-- 2. Allow PUBLIC READ access on all public buckets
-- This ensures ANY viewer (authenticated subscribers, creators, or anonymous guests)
-- can view uploaded profile avatars, covers, and media without 403 Forbidden errors.
DROP POLICY IF EXISTS "Public can view Daysman Gad media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view all media buckets" ON storage.objects;
CREATE POLICY "Public can view all media buckets" 
  ON storage.objects 
  FOR SELECT 
  TO public 
  USING (bucket_id IN ('Daysman Gad', 'avatars', 'media', 'public', 'posts'));

-- 3. Allow AUTHENTICATED users to upload files to public media buckets
DROP POLICY IF EXISTS "Authenticated users can upload to Daysman Gad" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to all media buckets" ON storage.objects;
CREATE POLICY "Authenticated users can upload to all media buckets" 
  ON storage.objects 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id IN ('Daysman Gad', 'avatars', 'media', 'public', 'posts'));

-- 4. Allow AUTHENTICATED users to update their files
DROP POLICY IF EXISTS "Authenticated users can update their uploads in Daysman Gad" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their uploads in all media buckets" ON storage.objects;
CREATE POLICY "Authenticated users can update their uploads in all media buckets" 
  ON storage.objects 
  FOR UPDATE 
  TO authenticated 
  USING (bucket_id IN ('Daysman Gad', 'avatars', 'media', 'public', 'posts'));

-- 5. Allow AUTHENTICATED users to delete their files
DROP POLICY IF EXISTS "Authenticated users can delete their uploads in Daysman Gad" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their uploads in all media buckets" ON storage.objects;
CREATE POLICY "Authenticated users can delete their uploads in all media buckets" 
  ON storage.objects 
  FOR DELETE 
  TO authenticated 
  USING (bucket_id IN ('Daysman Gad', 'avatars', 'media', 'public', 'posts'));

-- 6. Ensure `public.users` table has all necessary avatar and profile columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;

-- 7. Ensure `public.users` RLS permits public reading of avatars & names
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view users" ON public.users;
CREATE POLICY "Public can view users" 
  ON public.users 
  FOR SELECT 
  TO public 
  USING (true);

DROP POLICY IF EXISTS "Users can update own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own KYC details" ON public.users;
CREATE POLICY "Users can update own record" 
  ON public.users 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid()::text = uid::text)
  WITH CHECK (auth.uid()::text = uid::text);

DROP POLICY IF EXISTS "Users can insert own record" ON public.users;
CREATE POLICY "Users can insert own record" 
  ON public.users 
  FOR INSERT 
  TO public 
  WITH CHECK (true);

-- 8. Ensure `public.creator_profiles` table has avatar columns and public access
CREATE TABLE IF NOT EXISTS public.creator_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  avatar TEXT,
  cover_image TEXT,
  bio TEXT,
  location TEXT DEFAULT 'Nairobi, Kenya',
  monthly_price NUMERIC DEFAULT 1000,
  age INT DEFAULT 24,
  tags TEXT[] DEFAULT ARRAY['VIP Content', 'Direct Chat', 'Exclusive Photos'],
  gallery TEXT[] DEFAULT ARRAY[]::TEXT[],
  promo_discount NUMERIC DEFAULT 50,
  promo_active BOOLEAN DEFAULT true,
  total_subscribers INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.creator_profiles ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.creator_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.creator_profiles ADD COLUMN IF NOT EXISTS cover_image TEXT;

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view creator_profiles" ON public.creator_profiles;
CREATE POLICY "Public can view creator_profiles" 
  ON public.creator_profiles 
  FOR SELECT 
  TO public 
  USING (true);

DROP POLICY IF EXISTS "Users can upsert own creator profile" ON public.creator_profiles;
CREATE POLICY "Users can upsert own creator profile" 
  ON public.creator_profiles 
  FOR ALL 
  TO authenticated 
  USING (auth.uid()::text = user_id::text) 
  WITH CHECK (auth.uid()::text = user_id::text);

-- 9. Synchronize any existing avatar between users and creator_profiles
UPDATE public.users u
SET avatar = COALESCE(u.avatar, cp.avatar_url, cp.avatar)
FROM public.creator_profiles cp
WHERE u.uid::text = cp.user_id::text
  AND u.avatar IS NULL
  AND (cp.avatar_url IS NOT NULL OR cp.avatar IS NOT NULL);

UPDATE public.creator_profiles cp
SET avatar_url = COALESCE(cp.avatar_url, cp.avatar, u.avatar),
    avatar = COALESCE(cp.avatar, cp.avatar_url, u.avatar)
FROM public.users u
WHERE cp.user_id::text = u.uid::text
  AND (cp.avatar_url IS NULL AND cp.avatar IS NULL)
  AND u.avatar IS NOT NULL;

