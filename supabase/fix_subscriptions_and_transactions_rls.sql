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


-- 3. Allow updating creator_profiles total_subscribers
DROP POLICY IF EXISTS "Allow updating creator profile stats" ON public.creator_profiles;
CREATE POLICY "Allow updating creator profile stats"
ON public.creator_profiles FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4. Set annahloon total_subscribers to 1 immediately
UPDATE public.creator_profiles
SET total_subscribers = GREATEST(COALESCE(total_subscribers, 0), 1)
WHERE user_id = 'c32e982c-0e8f-4d1d-b0c0-926d3440ec5b';

-- 5. Insert the active subscription for annahloon if not present
INSERT INTO public.subscriptions (
  fan_id,
  creator_id,
  tier_name,
  status,
  expires_at
)
VALUES (
  'e6c7ceee-024a-4a32-be19-7897775a99c7', -- Daysman gad
  'c32e982c-0e8f-4d1d-b0c0-926d3440ec5b', -- annahloon
  'VIP Tier',
  'active',
  (now() + interval '30 days')
)
ON CONFLICT DO NOTHING;

-- 6. Insert the completed transaction (Ref: UK71Y1HU5W) if not present
INSERT INTO public.transactions (
  type,
  gross_amount,
  platform_fee,
  net_amount,
  status,
  to_creator_id,
  from_user_id,
  reference_id
)
VALUES (
  'subscription',
  1000,
  300,
  700,
  'completed',
  'c32e982c-0e8f-4d1d-b0c0-926d3440ec5b',
  'e6c7ceee-024a-4a32-be19-7897775a99c7',
  'UK71Y1HU5W'
)
ON CONFLICT DO NOTHING;
