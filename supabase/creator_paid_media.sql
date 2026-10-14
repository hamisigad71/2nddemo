ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS visibility text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS media_private boolean NOT NULL DEFAULT false;

UPDATE public.posts
SET visibility = CASE WHEN is_locked THEN 'ppv' ELSE 'public' END
WHERE visibility IS NULL;

ALTER TABLE public.posts
  ALTER COLUMN visibility SET DEFAULT 'public',
  ALTER COLUMN visibility SET NOT NULL;

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_visibility_check,
  DROP CONSTRAINT IF EXISTS posts_status_check,
  ADD CONSTRAINT posts_visibility_check
    CHECK (visibility IN ('public', 'subscribers', 'ppv')),
  ADD CONSTRAINT posts_status_check
    CHECK (status IN ('published', 'draft'));

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS post_id text;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published posts and owner drafts readable" ON public.posts;
CREATE POLICY "Published posts and owner drafts readable"
ON public.posts FOR SELECT TO anon, authenticated
USING (
  status = 'published'
  OR creator_id::text = auth.uid()::text
);

DROP POLICY IF EXISTS "Creator content read access boundary" ON public.posts;
CREATE POLICY "Creator content read access boundary"
ON public.posts AS RESTRICTIVE FOR SELECT TO anon, authenticated
USING (
  status = 'published'
  OR creator_id::text = auth.uid()::text
);

DROP POLICY IF EXISTS "Creators insert own posts" ON public.posts;
CREATE POLICY "Creators insert own posts"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (creator_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Creator content insert access boundary" ON public.posts;
CREATE POLICY "Creator content insert access boundary"
ON public.posts AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (creator_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Creators update own posts" ON public.posts;
CREATE POLICY "Creators update own posts"
ON public.posts FOR UPDATE TO authenticated
USING (creator_id::text = auth.uid()::text)
WITH CHECK (creator_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Creator content update access boundary" ON public.posts;
CREATE POLICY "Creator content update access boundary"
ON public.posts AS RESTRICTIVE FOR UPDATE TO authenticated
USING (creator_id::text = auth.uid()::text)
WITH CHECK (creator_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Creators delete own posts" ON public.posts;
CREATE POLICY "Creators delete own posts"
ON public.posts FOR DELETE TO authenticated
USING (creator_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Creator content delete access boundary" ON public.posts;
CREATE POLICY "Creator content delete access boundary"
ON public.posts AS RESTRICTIVE FOR DELETE TO authenticated
USING (creator_id::text = auth.uid()::text);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creator-private-media',
  'creator-private-media',
  false,
  52428800,
  ARRAY['image/*', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.can_view_creator_private_media(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.media_url = object_name
      AND (
        p.creator_id::text = auth.uid()::text
        OR (
          p.status = 'published'
          AND (
            p.visibility = 'public'
            OR (
              p.visibility = 'subscribers'
              AND EXISTS (
                SELECT 1
                FROM public.subscriptions s
                WHERE s.fan_id::text = auth.uid()::text
                  AND s.creator_id::text = p.creator_id::text
                  AND s.status = 'active'
                  AND (s.expires_at IS NULL OR s.expires_at > now())
              )
            )
            OR (
              p.visibility = 'ppv'
              AND EXISTS (
                SELECT 1
                FROM public.transactions t
                WHERE t.post_id = p.id::text
                  AND t.from_user_id::text = auth.uid()::text
                  AND t.to_creator_id::text = p.creator_id::text
                  AND t.type = 'ppv'
                  AND t.status = 'completed'
              )
            )
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_creator_private_media(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_creator_private_media(text) TO authenticated;

DROP POLICY IF EXISTS "Creators upload private media to own folder" ON storage.objects;
CREATE POLICY "Creators upload private media to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'creator-private-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Creators and entitled fans read private media" ON storage.objects;
CREATE POLICY "Creators and entitled fans read private media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'creator-private-media'
  AND public.can_view_creator_private_media(name)
);

DROP POLICY IF EXISTS "Creators update private media in own folder" ON storage.objects;
CREATE POLICY "Creators update private media in own folder"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'creator-private-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'creator-private-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Creators delete private media in own folder" ON storage.objects;
CREATE POLICY "Creators delete private media in own folder"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'creator-private-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
