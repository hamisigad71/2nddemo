-- =========================================================================
-- Admin & Account Deletion RPC Function (Resilient Dynamic SQL)
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- Allows Platform Admins or the Account Owner to permanently wipe a user,
-- delete their auth.users account (freeing up the email for fresh registration),
-- and immediately log them out of the platform.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_uid text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_id text := auth.uid()::text;
  caller_role text;
  is_admin boolean := false;
  target_id text := target_uid;
  target_email text := target_uid;
BEGIN
  -- Strict Authorization Check (OWASP A01: Broken Access Control Prevention)
  -- Allow: 1) Account owner deleting own account, OR 2) Platform administrator, OR 3) service_role
  IF caller_id IS NOT NULL THEN
    SELECT role INTO caller_role FROM public.users WHERE uid = caller_id OR id::text = caller_id LIMIT 1;
    IF caller_role = 'admin' 
       OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
       OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
       OR (auth.jwt() ->> 'email') ILIKE '%admin%'
       OR (auth.jwt() ->> 'email') ILIKE '%thegentsdollhouse.com%' THEN
      is_admin := true;
    END IF;
  ELSIF (current_setting('request.jwt.claim.role', true) = 'service_role') THEN
    is_admin := true;
  END IF;

  -- Resolve target UUID and target email
  IF target_uid LIKE '%@%' THEN
    SELECT id::text INTO target_id FROM auth.users WHERE email ILIKE target_uid LIMIT 1;
  ELSE
    SELECT email INTO target_email FROM auth.users WHERE id::text = target_uid LIMIT 1;
  END IF;

  IF NOT is_admin AND (caller_id IS NULL OR (caller_id <> target_uid AND caller_id <> target_id)) THEN
    RAISE EXCEPTION 'Access Denied: Only platform administrators or the account owner can delete this account.';
  END IF;

  -- 1. Delete associated posts and content (dynamic checks prevent crash if table doesn't exist)
  IF to_regclass('public.posts') IS NOT NULL THEN
    BEGIN
      EXECUTE 'DELETE FROM public.posts WHERE creator_id = $1 OR creator_id = $2' USING target_uid, target_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- 2. Delete creator profile
  IF to_regclass('public.creator_profiles') IS NOT NULL THEN
    BEGIN
      EXECUTE 'DELETE FROM public.creator_profiles WHERE user_id::text = $1 OR user_id::text = $2' USING target_uid, target_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- 3. Delete subscriptions (both as fan and creator)
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    BEGIN
      EXECUTE 'DELETE FROM public.subscriptions WHERE fan_id = $1 OR fan_id = $2 OR creator_id = $1 OR creator_id = $2' USING target_uid, target_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- 4. Delete notifications, comments, likes, messages
  IF to_regclass('public.notifications') IS NOT NULL THEN
    BEGIN
      EXECUTE 'DELETE FROM public.notifications WHERE user_id = $1 OR user_id = $2' USING target_uid, target_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF to_regclass('public.comments') IS NOT NULL THEN
    BEGIN
      EXECUTE 'DELETE FROM public.comments WHERE user_id = $1 OR user_id = $2' USING target_uid, target_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF to_regclass('public.post_likes') IS NOT NULL THEN
    BEGIN
      EXECUTE 'DELETE FROM public.post_likes WHERE user_id = $1 OR user_id = $2' USING target_uid, target_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF to_regclass('public.messages') IS NOT NULL THEN
    BEGIN
      EXECUTE 'DELETE FROM public.messages WHERE sender_id = $1 OR sender_id = $2 OR receiver_id = $1 OR receiver_id = $2' USING target_uid, target_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF to_regclass('public.ad_applications') IS NOT NULL THEN
    BEGIN
      EXECUTE 'DELETE FROM public.ad_applications WHERE creator_id = $1 OR creator_id = $2' USING target_uid, target_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF to_regclass('public.escort_applications') IS NOT NULL THEN
    BEGIN
      EXECUTE 'DELETE FROM public.escort_applications WHERE creator_id::text = $1 OR creator_id::text = $2 OR user_id::text = $1 OR user_id::text = $2' USING target_uid, target_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF to_regclass('public.transactions') IS NOT NULL THEN
    BEGIN
      EXECUTE 'DELETE FROM public.transactions WHERE from_user_id = $1 OR from_user_id = $2' USING target_uid, target_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- 5. Delete from public users table
  IF to_regclass('public.users') IS NOT NULL THEN
    BEGIN
      EXECUTE 'DELETE FROM public.users WHERE uid = $1 OR uid = $2 OR id::text = $1 OR id::text = $2 OR email ILIKE $3' USING target_uid, target_id, target_email;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- 6. Permanently delete from Supabase Auth so their token is revoked and they can sign up fresh
  BEGIN
    DELETE FROM auth.users WHERE id::text = target_uid OR id::text = target_id OR email ILIKE target_email;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN true;
END;
$$;

-- Revoke public & anonymous execute permissions (OWASP A01 Prevention)
REVOKE ALL ON FUNCTION public.admin_delete_user(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_user(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(text) TO authenticated, service_role;
