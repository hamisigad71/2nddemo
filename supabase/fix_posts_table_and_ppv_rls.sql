-- =========================================================================
-- Fix Posts Table Schema & RLS for Creators
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- =========================================================================

-- 1. Add missing columns to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_private BOOLEAN DEFAULT false;

-- 2. Populate visibility for existing records
UPDATE public.posts
SET visibility = CASE WHEN is_locked THEN 'ppv' ELSE 'public' END
WHERE visibility IS NULL;

-- 3. Enable RLS on posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 4. Clean up existing posts policies
DROP POLICY IF EXISTS "Public can view published posts" ON public.posts;
DROP POLICY IF EXISTS "Creators can insert own posts" ON public.posts;
DROP POLICY IF EXISTS "Creators can update own posts" ON public.posts;
DROP POLICY IF EXISTS "Creators can delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Published posts and owner drafts readable" ON public.posts;
DROP POLICY IF EXISTS "Creator content read access boundary" ON public.posts;
DROP POLICY IF EXISTS "Creators insert own posts" ON public.posts;
DROP POLICY IF EXISTS "Creator content insert access boundary" ON public.posts;
DROP POLICY IF EXISTS "Creators update own posts" ON public.posts;
DROP POLICY IF EXISTS "Creator content update access boundary" ON public.posts;
DROP POLICY IF EXISTS "Creators delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Creator content delete access boundary" ON public.posts;

-- 5. Standard Permissive Policies
-- Allow anyone (public/subscribers) to read published posts, and creators to read their own drafts
CREATE POLICY "Public can view published posts"
ON public.posts
FOR SELECT
TO public
USING (
  status = 'published'
  OR creator_id::text = auth.uid()::text
  OR auth.uid() IS NULL
);

-- Allow authenticated creators to insert their posts
CREATE POLICY "Creators can insert own posts"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (creator_id::text = auth.uid()::text);

-- Allow creators to update their own posts
CREATE POLICY "Creators can update own posts"
ON public.posts
FOR UPDATE
TO authenticated
USING (creator_id::text = auth.uid()::text)
WITH CHECK (creator_id::text = auth.uid()::text);

-- Allow creators to delete their own posts
CREATE POLICY "Creators can delete own posts"
ON public.posts
FOR DELETE
TO authenticated
USING (creator_id::text = auth.uid()::text);

