-- ==============================================================================
-- REMOVE TEST TRANSACTION & TEST SUBSCRIPTION FOR UK71Y1HU5W
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/gitkzykasegtygoybjhq/sql
-- ==============================================================================

-- 1. Delete the test transaction UK71Y1HU5W
DELETE FROM public.transactions 
WHERE reference_id = 'UK71Y1HU5W' 
   OR (from_user_id = 'e6c7ceee-024a-4a32-be19-7897775a99c7' AND to_creator_id = 'c32e982c-0e8f-4d1d-b0c0-926d3440ec5b');

-- 2. Delete the test subscription record for Daysman gad -> annahloon
DELETE FROM public.subscriptions 
WHERE fan_id = 'e6c7ceee-024a-4a32-be19-7897775a99c7' 
  AND creator_id = 'c32e982c-0e8f-4d1d-b0c0-926d3440ec5b';

-- 3. Recalculate annahloon's actual active subscriber count from real subscriptions
UPDATE public.creator_profiles 
SET total_subscribers = (
  SELECT COUNT(DISTINCT fan_id) 
  FROM public.subscriptions 
  WHERE creator_id = 'c32e982c-0e8f-4d1d-b0c0-926d3440ec5b' 
    AND status = 'active'
)
WHERE user_id = 'c32e982c-0e8f-4d1d-b0c0-926d3440ec5b';

-- 4. Delete the test notification sent for this transaction if any
DELETE FROM public.notifications 
WHERE (title ILIKE '%Daysman gad%' OR message ILIKE '%Daysman gad%')
  AND user_id = 'c32e982c-0e8f-4d1d-b0c0-926d3440ec5b';
