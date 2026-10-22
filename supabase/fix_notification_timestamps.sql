-- =========================================================================
-- Fix Notification Timestamps: Align with Real User Registration Times
-- Run this in your Supabase Dashboard -> SQL Editor
-- =========================================================================

-- 1. Correct all existing "New Creator Joined" notification timestamps
-- to match the actual signup time of the creator from `public.users`
UPDATE public.notifications n
SET created_at = u.created_at
FROM public.users u
WHERE (
  n.link = '/creator/' || u.uid 
  OR n.action_url = '/creator/' || u.uid 
  OR n.message LIKE '%' || u.name || '%'
)
AND (
  n.title LIKE 'New Creator Joined%' 
  OR n.badge = 'New Creator'
);

-- 2. Update the trigger function so all future new creator notifications
-- automatically inherit the creator's exact registration timestamp (NEW.created_at)
-- rather than the time the trigger finishes.
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
  creator_time TIMESTAMPTZ;
BEGIN
  -- Only trigger when role is creator and it's a new creator (or role just upgraded to creator)
  IF NEW.role = 'creator' AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM 'creator') THEN
    creator_id := NEW.uid;
    creator_name := COALESCE(NULLIF(NEW.name, ''), 'New Creator');
    creator_avatar := NEW.avatar;
    creator_time := COALESCE(NEW.created_at, NOW());

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

    -- 1. Insert notification for Platform Admins with exact registration time
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
      creator_time
    );

    -- 2. Insert notifications for all active subscribers & fans with exact registration time
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
      creator_time
    FROM public.users u
    WHERE u.uid != creator_id
      AND (u.role IN ('subscriber', 'fan', 'user') OR u.role IS NULL);

  END IF;

  RETURN NEW;
END;
$$;

-- 3. Verify the updated timestamps
SELECT n.title, n.created_at, u.created_at AS actual_user_signup
FROM public.notifications n
LEFT JOIN public.users u ON n.link = '/creator/' || u.uid
WHERE n.title LIKE 'New Creator Joined%'
ORDER BY n.created_at DESC
LIMIT 10;

