-- =========================================================================
-- Guarantee every Supabase Auth signup has a public.users profile row
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
--
-- Why: profile rows were only created from the browser after signup. When
-- email confirmation is on, the signup has no session yet, so the insert
-- runs as `anon` and can be silently rejected by RLS. If the user then never
-- logs in again (or the email/OTP step stalls), they exist in auth.users
-- but NOT in public.users, so they are invisible in the admin portal and on
-- the subscriber Discover page.
-- =========================================================================

-- 1. Columns the app already reads/writes but that are missing in production
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Trigger function: copy auth.users -> public.users on signup
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role TEXT := COALESCE(NULLIF(meta->>'role', ''), 'subscriber');
  v_name TEXT := COALESCE(
    NULLIF(meta->>'name', ''),
    NULLIF(meta->>'full_name', ''),
    split_part(NEW.email, '@', 1),
    'User'
  );
BEGIN
  -- Skip if a profile already exists for this uid or email
  IF EXISTS (SELECT 1 FROM public.users WHERE uid = NEW.id::text)
     OR (NEW.email IS NOT NULL AND EXISTS (
           SELECT 1 FROM public.users WHERE lower(email) = lower(NEW.email)))
  THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (uid, name, email, avatar, phone, role)
  VALUES (
    NEW.id::text,
    v_name,
    NEW.email,
    COALESCE(meta->>'avatar_url', meta->>'picture'),
    NULLIF(meta->>'phone', ''),
    v_role
  );

  IF v_role = 'creator' THEN
    BEGIN
      INSERT INTO public.creator_profiles (user_id, display_name)
      VALUES (NEW.id, v_name)
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'creator_profiles insert failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block signup because of a profile-sync problem
  RAISE WARNING 'handle_new_auth_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 3. Backfill: recover users who already signed up but have no profile row
--    (this is what restores Vincent)
INSERT INTO public.users (uid, name, email, avatar, phone, role)
SELECT
  au.id::text,
  COALESCE(NULLIF(au.raw_user_meta_data->>'name', ''),
           NULLIF(au.raw_user_meta_data->>'full_name', ''),
           split_part(au.email, '@', 1)),
  au.email,
  COALESCE(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture'),
  NULLIF(au.raw_user_meta_data->>'phone', ''),
  COALESCE(NULLIF(au.raw_user_meta_data->>'role', ''), 'subscriber')
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.uid = au.id::text)
  AND NOT EXISTS (SELECT 1 FROM public.users pu WHERE lower(pu.email) = lower(au.email));

INSERT INTO public.creator_profiles (user_id, display_name)
SELECT au.id, pu.name
FROM auth.users au
JOIN public.users pu ON pu.uid = au.id::text
WHERE pu.role = 'creator'
ON CONFLICT (user_id) DO NOTHING;

-- 4. Verify: should list Vincent (and any other recovered users)
SELECT uid, name, email, role, created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;
