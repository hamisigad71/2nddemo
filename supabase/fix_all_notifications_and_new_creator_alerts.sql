-- =========================================================================
-- MASTER FIX: Notifications & Real-Time Alerts for Subscribers & Admin
-- Run this in your Supabase Dashboard -> SQL Editor
-- =========================================================================

-- 1. Ensure `notifications` table and all columns exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  link TEXT,
  avatar TEXT,
  badge TEXT,
  action_label TEXT,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_label TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

-- 2. FIX RLS POLICIES ON NOTIFICATIONS (CRITICAL: ALLOW INSERT TO EVERYONE)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop all possible existing conflicting policies
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow inserting notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public can insert notifications" ON public.notifications;

-- This policy allows creators & apps to dispatch notifications to subscribers and admins
CREATE POLICY "Allow inserting notifications" 
ON public.notifications
FOR INSERT 
TO public
WITH CHECK (true);

-- Allow subscribers and admins to read their notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" 
ON public.notifications
FOR SELECT 
TO public
USING (
  user_id = auth.uid()::text 
  OR user_id = 'admin'
  OR (SELECT role FROM public.users WHERE uid = auth.uid()::text) = 'admin'
  OR auth.role() = 'service_role'
);

-- Allow subscribers and admins to mark notifications as read
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" 
ON public.notifications
FOR UPDATE 
TO public
USING (
  user_id = auth.uid()::text 
  OR user_id = 'admin'
  OR (SELECT role FROM public.users WHERE uid = auth.uid()::text) = 'admin'
)
WITH CHECK (true);

-- Allow subscribers and admins to delete notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" 
ON public.notifications
FOR DELETE 
TO public
USING (
  user_id = auth.uid()::text 
  OR user_id = 'admin'
  OR (SELECT role FROM public.users WHERE uid = auth.uid()::text) = 'admin'
);

-- 3. ENABLE SUPABASE REALTIME REPLICATION FOR NOTIFICATIONS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- 4. AUTOMATIC DATABASE TRIGGER: NOTIFY SUBSCRIBERS & ADMIN WHEN A CREATOR JOINS
-- This guarantees notifications are created AT DATABASE LEVEL immediately upon signup,
-- even if email OTP is pending, or if the user signs up via OAuth, or if the browser closes!
CREATE OR REPLACE FUNCTION public.notify_on_new_creator_joined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_name TEXT;
  creator_avatar TEXT;
  creator_id TEXT;
BEGIN
  -- Only trigger when role is creator and it's a new creator (or role just upgraded to creator)
  IF NEW.role = 'creator' AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM 'creator') THEN
    creator_id := NEW.uid;
    creator_name := COALESCE(NULLIF(NEW.name, ''), 'New Creator');
    creator_avatar := NEW.avatar;

    -- Avoid duplicate welcome notifications for the same creator within 10 minutes
    IF EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = 'admin' 
        AND link = '/admin/creators' 
        AND title LIKE '%' || creator_name || '%'
        AND created_at > NOW() - INTERVAL '10 minutes'
    ) THEN
      RETURN NEW;
    END IF;

    -- 1. Insert notification for Platform Admins
    INSERT INTO public.notifications (
      user_id, title, message, type, link, avatar, badge, action_label, action_url, is_read, created_at
    ) VALUES (
      'admin',
      'New Creator Joined Platform! 🎉',
      creator_name || ' just registered on The Gents DollHouse. Review their creator account and compliance status.',
      'creator',
      '/admin/creators',
      creator_avatar,
      'New Creator',
      'Manage Creators',
      '/admin/creators',
      false,
      COALESCE(NEW.created_at, NOW())
    );

    -- 2. Insert notifications for all active subscribers & fans
    INSERT INTO public.notifications (
      user_id, title, message, type, link, avatar, badge, action_label, action_url, is_read, created_at
    )
    SELECT
      u.uid,
      'New Creator Joined: ' || creator_name || '! ✨',
      creator_name || ' has just joined The Gents DollHouse. Discover their profile, explore exclusive media, and subscribe!',
      'creator',
      '/creator/' || creator_id,
      creator_avatar,
      'New Creator',
      'View Profile',
      '/creator/' || creator_id,
      false,
      COALESCE(NEW.created_at, NOW())
    FROM public.users u
    WHERE u.uid != creator_id
      AND (u.role IN ('subscriber', 'fan', 'user') OR u.role IS NULL);

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_creator ON public.users;
CREATE TRIGGER trg_notify_new_creator
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_creator_joined();

-- 5. BACKFILL NOTIFICATIONS FOR RECENT CREATORS WHO JOINED TODAY
-- This notifies subscribers and admin for Faith Hr, Lucy mwagi, Elizabeth Gomez, fatma loki, Daysman Gad
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN 
    SELECT uid, name, avatar, created_at
    FROM public.users 
    WHERE role = 'creator'
    ORDER BY created_at DESC 
    LIMIT 5
  LOOP
    -- Insert admin notification if not present
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = 'admin' 
        AND message LIKE '%' || COALESCE(c.name, '') || '%'
    ) THEN
      INSERT INTO public.notifications (
        user_id, title, message, type, link, avatar, badge, action_label, action_url, is_read, created_at
      ) VALUES (
        'admin',
        'New Creator Joined Platform! 🎉',
        c.name || ' just registered on The Gents DollHouse. Review their creator account and compliance status.',
        'creator',
        '/admin/creators',
        c.avatar,
        'New Creator',
        'Manage Creators',
        '/admin/creators',
        false,
        COALESCE(c.created_at, NOW())
      );
    END IF;

    -- Insert notifications for subscribers if not present
    INSERT INTO public.notifications (
      user_id, title, message, type, link, avatar, badge, action_label, action_url, is_read, created_at
    )
    SELECT
      u.uid,
      'New Creator Joined: ' || c.name || '! ✨',
      c.name || ' has just joined The Gents DollHouse. Discover their profile, explore exclusive media, and subscribe!',
      'creator',
      '/creator/' || c.uid,
      c.avatar,
      'New Creator',
      'View Profile',
      '/creator/' || c.uid,
      false,
      COALESCE(c.created_at, NOW())
    FROM public.users u
    WHERE u.uid != c.uid
      AND (u.role IN ('subscriber', 'fan', 'user') OR u.role IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n 
        WHERE n.user_id = u.uid 
          AND n.link = '/creator/' || c.uid
      );
  END LOOP;
END $$;

-- 6. VERIFY: View the generated notifications
SELECT id, user_id, title, created_at 
FROM public.notifications 
ORDER BY created_at DESC 
LIMIT 15;

