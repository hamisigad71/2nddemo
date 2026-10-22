-- =========================================================================
-- Create Notifications Table and Enable Real-Time Delivery
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- =========================================================================

-- 1. Create table if it doesn't exist
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

-- Ensure all columns exist in case the table was created earlier with a minimal schema
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_label TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Indexes for fast real-time queries and filtering
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow creators and authenticated users to insert notifications for subscribers and platform admin
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Anyone can insert notifications" ON public.notifications
  FOR INSERT TO public
  WITH CHECK (true);

-- Allow subscribers to view their notifications and admins to view admin/system notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO public
  USING (
    user_id = auth.uid()::text 
    OR user_id = 'admin'
    OR (SELECT role FROM public.users WHERE uid = auth.uid()::text) = 'admin'
    OR auth.role() = 'service_role'
  );

-- Allow users and admins to mark notifications as read
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO public
  USING (
    user_id = auth.uid()::text 
    OR user_id = 'admin'
    OR (SELECT role FROM public.users WHERE uid = auth.uid()::text) = 'admin'
  )
  WITH CHECK (true);

-- Allow users and admins to delete notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE TO public
  USING (
    user_id = auth.uid()::text 
    OR user_id = 'admin'
    OR (SELECT role FROM public.users WHERE uid = auth.uid()::text) = 'admin'
  );

-- 4. Enable Supabase Real-Time replication so subscribers and admins get instant live toast/badge updates
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
