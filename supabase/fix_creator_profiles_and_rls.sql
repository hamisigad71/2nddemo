-- =========================================================================
-- Fix Creator Profiles, Columns, and RLS Permissions in Supabase
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- =========================================================================

-- 1. Ensure `users` table has columns for bio and cover_image
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Allow public read access to `users` table
-- This allows subscribers, fans, and visitors to see registered creators,
-- their profile photos, names, handles, and bios.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view users" ON public.users;
CREATE POLICY "Public can view users" 
  ON public.users 
  FOR SELECT 
  TO public 
  USING (true);

DROP POLICY IF EXISTS "Users can update own record" ON public.users;
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

-- 3. Create `creator_profiles` table if missing
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

-- 4. Enable public read and owner write on `creator_profiles`
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

-- 5. Ensure `Daysman Gad` storage bucket is public and allows read access
INSERT INTO storage.buckets (id, name, public)
VALUES ('Daysman Gad', 'Daysman Gad', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy to allow anyone to read files from Daysman Gad bucket
DROP POLICY IF EXISTS "Public can view Daysman Gad media" ON storage.objects;
CREATE POLICY "Public can view Daysman Gad media" 
  ON storage.objects 
  FOR SELECT 
  TO public 
  USING (bucket_id = 'Daysman Gad');

-- Policy to allow authenticated users to upload files to their folder in Daysman Gad
DROP POLICY IF EXISTS "Authenticated users can upload to Daysman Gad" ON storage.objects;
CREATE POLICY "Authenticated users can upload to Daysman Gad" 
  ON storage.objects 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'Daysman Gad');

DROP POLICY IF EXISTS "Authenticated users can update their uploads in Daysman Gad" ON storage.objects;
CREATE POLICY "Authenticated users can update their uploads in Daysman Gad" 
  ON storage.objects 
  FOR UPDATE 
  TO authenticated 
  USING (bucket_id = 'Daysman Gad');

DROP POLICY IF EXISTS "Authenticated users can delete their uploads in Daysman Gad" ON storage.objects;
CREATE POLICY "Authenticated users can delete their uploads in Daysman Gad" 
  ON storage.objects 
  FOR DELETE 
  TO authenticated 
  USING (bucket_id = 'Daysman Gad');

