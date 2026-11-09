-- ==============================================================================
-- FIX SUBSCRIPTIONS & TRANSACTIONS RLS POLICIES
-- Run this script in Supabase SQL Editor to allow subscribers to record their subscriptions
-- and allow payments and transactions to be saved and viewed by subscribers and creators.
-- ==============================================================================

-- 1. Enable RLS on subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users and anon users (paying fans) to insert subscriptions
DROP POLICY IF EXISTS "Allow fans and guests to insert subscriptions" ON public.subscriptions;
CREATE POLICY "Allow fans and guests to insert subscriptions"
ON public.subscriptions FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Allow reading subscriptions (for public subscriber count & subscriber verification)
DROP POLICY IF EXISTS "Allow reading active subscriptions" ON public.subscriptions;
CREATE POLICY "Allow reading active subscriptions"
ON public.subscriptions FOR SELECT TO anon, authenticated
USING (true);

-- Allow fans and creators to update their subscriptions
DROP POLICY IF EXISTS "Allow updating subscriptions" ON public.subscriptions;
CREATE POLICY "Allow updating subscriptions"
ON public.subscriptions FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (true);


-- 2. Enable RLS on transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Allow inserting transactions from client and webhook
DROP POLICY IF EXISTS "Allow inserting transactions" ON public.transactions;
CREATE POLICY "Allow inserting transactions"
ON public.transactions FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Allow reading transactions
DROP POLICY IF EXISTS "Allow reading transactions" ON public.transactions;
CREATE POLICY "Allow reading transactions"
ON public.transactions FOR SELECT TO anon, authenticated
USING (true);

-- Allow updating transactions
DROP POLICY IF EXISTS "Allow updating transactions" ON public.transactions;
CREATE POLICY "Allow updating transactions"
ON public.transactions FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (true);


-- 2b. Enable RLS and permissions on notifications table for creators & users
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow inserting notifications" ON public.notifications;
CREATE POLICY "Allow inserting notifications"
ON public.notifications FOR INSERT TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow reading notifications" ON public.notifications;
CREATE POLICY "Allow reading notifications"
ON public.notifications FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow updating notifications" ON public.notifications;
CREATE POLICY "Allow updating notifications"
ON public.notifications FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow deleting notifications" ON public.notifications;
CREATE POLICY "Allow deleting notifications"
ON public.notifications FOR DELETE TO anon, authenticated
USING (true);


-- 3. Allow updating creator_profiles total_subscribers
DROP POLICY IF EXISTS "Allow updating creator profile stats" ON public.creator_profiles;
CREATE POLICY "Allow updating creator profile stats"
ON public.creator_profiles FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4b. Set beunice_kamau total_subscribers to 1 immediately (from recent payment)
UPDATE public.creator_profiles
SET total_subscribers = GREATEST(COALESCE(total_subscribers, 0), 1)
WHERE user_id = 'e74f6c55-d901-4064-b386-4fe85dd25521';

-- 5b. Insert the active subscription for beunice_kamau (paid by owuor timothy)
INSERT INTO public.subscriptions (
  fan_id,
  creator_id,
  tier_name,
  status,
  expires_at
)
VALUES (
  '8e975481-fe80-47c7-ad8c-418d4eefa714', -- owuor timothy
  'e74f6c55-d901-4064-b386-4fe85dd25521', -- beunice_kamau
  'VIP Subscription',
  'active',
  (now() + interval '30 days')
)
ON CONFLICT DO NOTHING;

-- 6c. Insert Creator Notifications for All Subscriptions & Tips
INSERT INTO public.notifications (
  user_id,
  title,
  message,
  type,
  link,
  action_label,
  action_url,
  badge,
  is_read,
  created_at
)
VALUES
  (
    'e74f6c55-d901-4064-b386-4fe85dd25521', -- beunice_kamau
    'New VIP Subscriber! 👑',
    'owuor timothy just subscribed to your VIP Monthly (30 days) for KES 1,500. KES 1,050 has been credited to your wallet.',
    'subscription',
    '/wallet',
    'View Wallet',
    '/wallet',
    'VIP Fan',
    false,
    (now() - interval '2 hours')
  ),
  (
    'c32e982c-0e8f-4d1d-b0c0-926d3440ec5b', -- annahloon
    'New VIP Subscriber! 👑',
    'beunice_kamau just subscribed to your VIP Tier (30 days) for KES 1,000. KES 700 has been credited to your wallet.',
    'subscription',
    '/wallet',
    'View Wallet',
    '/wallet',
    'VIP Fan',
    false,
    '2026-11-07T21:35:55.55+00:00'
  ),
  (
    'c32e982c-0e8f-4d1d-b0c0-926d3440ec5b', -- annahloon
    'New VIP Subscriber! 👑',
    'lonerwolf just subscribed to your VIP Tier (30 days) for KES 1,000. KES 700 has been credited to your wallet.',
    'subscription',
    '/wallet',
    'View Wallet',
    '/wallet',
    'VIP Fan',
    false,
    '2026-11-07T19:44:13.427+00:00'
  ),
  (
    '367b5421-d9e6-4894-b0fd-18637c9d9fc5', -- timo
    'New VIP Subscriber! 👑',
    'the_playhosue just subscribed to your VIP Profile Access (30 days) for KES 1,000. KES 700 has been credited to your wallet.',
    'subscription',
    '/wallet',
    'View Wallet',
    '/wallet',
    'VIP Fan',
    false,
    '2026-10-24T04:42:03.537+00:00'
  ),
  (
    '7a08dcd6-a9d1-48c1-91b0-6793304c6ddf', -- Unfiltered_culture
    'New VIP Subscriber! 👑',
    'the_playhosue just subscribed to your VIP Profile Access (30 days) for KES 1,000. KES 700 has been credited to your wallet.',
    'subscription',
    '/wallet',
    'View Wallet',
    '/wallet',
    'VIP Fan',
    false,
    '2026-10-23T21:52:57.942+00:00'
  ),
  (
    '7a08dcd6-a9d1-48c1-91b0-6793304c6ddf', -- Unfiltered_culture
    'New Tip Received! 💰',
    'the_playhosue tipped you KES 100! KES 70 has been credited to your wallet.',
    'tip',
    '/wallet',
    'View Wallet',
    '/wallet',
    'Tip',
    false,
    '2026-10-24T05:20:02.015+00:00'
  ),
  (
    'a73694ea-1b7e-4a62-a36f-ca39d6a2b16f', -- DaysmanGad
    'New VIP Subscriber! 👑',
    'Ella Rains just subscribed to your VIP Monthly (30 days) for KES 200. KES 140 has been credited to your wallet.',
    'subscription',
    '/wallet',
    'View Wallet',
    '/wallet',
    'VIP Fan',
    false,
    '2026-10-22T22:00:17.158+00:00'
  )
ON CONFLICT DO NOTHING;
