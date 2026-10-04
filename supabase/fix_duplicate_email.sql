-- =====================================================
-- Fix: Remove duplicate email rows & enforce uniqueness
-- Run this in your Supabase SQL Editor (one-time migration)
-- =====================================================

-- STEP 1: Inspect duplicates first (READ ONLY — safe to run anytime)
SELECT email, array_agg(role) AS roles, array_agg(uid) AS uids, count(*) AS count
FROM users
GROUP BY email
HAVING count(*) > 1;

-- =====================================================
-- STEP 2: Delete duplicates — keep the row with the
-- "higher priority" role: creator > subscriber.
-- If you want to keep 'subscriber' instead, swap the roles below.
-- =====================================================
DELETE FROM users
WHERE uid IN (
  SELECT uid FROM (
    SELECT
      uid,
      email,
      role,
      ROW_NUMBER() OVER (
        PARTITION BY email
        ORDER BY
          CASE role
            WHEN 'admin'      THEN 1
            WHEN 'creator'    THEN 2
            WHEN 'subscriber' THEN 3
            ELSE 4
          END
      ) AS rn
    FROM users
  ) ranked
  WHERE rn > 1  -- remove all but the top-priority row per email
);

-- =====================================================
-- STEP 3: Add unique constraint on email
-- (will fail if Step 2 still left duplicates — re-check Step 1)
-- =====================================================
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
