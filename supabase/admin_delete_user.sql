-- =========================================================================
-- Admin Delete User RPC Function
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- Allows the Admin to permanently wipe a user, delete their auth account,
-- and instantly log them out of the platform.
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
BEGIN
  -- Strict Authorization Check (OWASP A01: Broken Access Control Prevention)
  -- Only allow: 1) Account owner deleting own account, OR 2) Platform administrator, OR 3) service_role
  IF caller_id IS NOT NULL THEN
    SELECT role INTO caller_role FROM public.users WHERE uid = caller_id OR id = caller_id LIMIT 1;
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

  IF NOT is_admin AND (caller_id IS NULL OR caller_id <> target_uid) THEN
    RAISE EXCEPTION 'Access Denied: Only platform administrators or the account owner can delete this account.';
  END IF;

  -- 1. Delete associated posts and content
  DELETE FROM public.posts WHERE creator_id = target_uid;
  
  -- 2. Delete creator profile
  DELETE FROM public.creator_profiles WHERE user_id::text = target_uid;
  
  -- 3. Delete subscriptions (both as fan and creator)
  DELETE FROM public.subscriptions WHERE fan_id = target_uid OR creator_id = target_uid;
  
  -- 4. Delete notifications, comments, likes, messages
  DELETE FROM public.notifications WHERE user_id = target_uid;
  DELETE FROM public.comments WHERE user_id = target_uid;
  DELETE FROM public.post_likes WHERE user_id = target_uid;
  DELETE FROM public.messages WHERE sender_id = target_uid OR receiver_id = target_uid;
  DELETE FROM public.ad_applications WHERE creator_id = target_uid;

  BEGIN
    DELETE FROM public.escort_applications WHERE creator_id::text = target_uid;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    DELETE FROM public.transactions WHERE from_user_id = target_uid;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 5. Delete from public users table
  DELETE FROM public.users WHERE uid = target_uid;

  -- 6. Permanently delete from Supabase Auth so their token is revoked and they are logged out
  DELETE FROM auth.users WHERE id::text = target_uid;

  RETURN true;
END;
$$;

-- Revoke public & anonymous execute permissions (OWASP A01 Prevention)
REVOKE ALL ON FUNCTION public.admin_delete_user(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_user(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(text) TO authenticated, service_role;

