-- Grant verified discovery status to only the three named creator accounts.
-- Their ID and selfie files are required before any payout can be requested.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS payout_kyc_required boolean NOT NULL DEFAULT false;

-- Ensure the names or emails resolve to the exact accounts.
-- This table holds the exact user ids used by later updates.
DROP TABLE IF EXISTS pg_temp.selected_creator_verification_targets;
CREATE TEMP TABLE selected_creator_verification_targets (
  target_name text PRIMARY KEY,
  user_id text NOT NULL UNIQUE
);

DO $$
DECLARE
  target_name text;
  matching_user_ids text[];
BEGIN
  FOREACH target_name IN ARRAY ARRAY['fatma loki', 'natalia ngina', 'ella rains']
  LOOP
    SELECT array_agg(DISTINCT users.uid::text ORDER BY users.uid::text)
    INTO matching_user_ids
    FROM public.users AS users
    LEFT JOIN public.creator_profiles AS profiles
      ON profiles.user_id::text = users.uid::text
    WHERE (
        lower(btrim(users.name)) = target_name
        OR lower(btrim(profiles.display_name)) = target_name
        OR (target_name = 'fatma loki' AND lower(users.email) = 'hadq@gmail.com')
        OR (target_name = 'natalia ngina' AND lower(users.email) = 'nataliangina62@gmail.com')
        OR (target_name = 'ella rains' AND lower(users.email) = 'ellarains00@gmail.com')
      );

    IF COALESCE(cardinality(matching_user_ids), 0) <> 1 THEN
      RAISE EXCEPTION
        'Expected exactly one creator account named "%", found %; no selected account changes were applied.',
        target_name,
        COALESCE(cardinality(matching_user_ids), 0);
    END IF;

    INSERT INTO selected_creator_verification_targets (target_name, user_id)
    VALUES (target_name, matching_user_ids[1]);
  END LOOP;
END;
$$;

-- Existing self-verification protection treats this migration like a service
-- operation. The setting is transaction-local and does not change app roles.
SELECT set_config('request.jwt.claim.role', 'service_role', true);

-- 1. Upgrade public.users to verified active creators
UPDATE public.users
SET role = 'creator',
    status = 'active',
    kyc_status = 'verified',
    is_verified = true,
    payout_kyc_required = true,
    cover_image = COALESCE(cover_image, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&q=80')
WHERE uid::text IN (SELECT user_id FROM selected_creator_verification_targets);

-- 2. Ensure each creator has a verified creator profile
INSERT INTO public.creator_profiles (
  user_id,
  display_name,
  bio,
  location,
  monthly_price,
  cover_image,
  avatar,
  avatar_url,
  is_active,
  is_verified,
  kyc_status,
  tags,
  promo_discount,
  promo_active,
  total_subscribers,
  created_at,
  updated_at
)
SELECT
  u.uid::text,
  u.name,
  'Welcome to my official creator page! Exclusive posts, videos, and private chats.',
  'Nairobi, Kenya',
  1000,
  COALESCE(u.cover_image, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&q=80'),
  u.avatar,
  u.avatar,
  true,
  true,
  'verified',
  ARRAY['VIP Content', 'Direct Chat', 'Exclusive Photos'],
  50,
  true,
  0,
  now(),
  now()
FROM public.users u
WHERE u.uid::text IN (SELECT user_id FROM selected_creator_verification_targets)
ON CONFLICT (user_id) DO UPDATE
SET
  display_name = COALESCE(creator_profiles.display_name, EXCLUDED.display_name),
  is_active = true,
  is_verified = true,
  kyc_status = 'verified',
  cover_image = COALESCE(creator_profiles.cover_image, EXCLUDED.cover_image),
  avatar = COALESCE(creator_profiles.avatar, EXCLUDED.avatar),
  avatar_url = COALESCE(creator_profiles.avatar_url, EXCLUDED.avatar_url),
  updated_at = now();

-- 3. Trigger to prevent account owner tampering with selected creator KYC status
CREATE OR REPLACE FUNCTION public.prevent_selected_creator_kyc_bypass()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND NOT EXISTS (
       SELECT 1
       FROM public.users admin_user
       WHERE admin_user.uid = auth.uid()::text
         AND admin_user.role = 'admin'
     )
  THEN
    IF TG_TABLE_NAME = 'users' THEN
      IF NEW.payout_kyc_required IS DISTINCT FROM OLD.payout_kyc_required THEN
        RAISE EXCEPTION 'Only an administrator can change payout identity requirements';
      END IF;

      IF OLD.payout_kyc_required
         AND NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
      THEN
        RAISE EXCEPTION 'Selected creator verification status cannot be changed by the account owner';
      END IF;
    ELSIF TG_TABLE_NAME = 'creator_profiles' THEN
      IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
         AND EXISTS (
           SELECT 1
           FROM public.users selected_user
           WHERE selected_user.uid::text = OLD.user_id::text
             AND selected_user.payout_kyc_required
         )
      THEN
        RAISE EXCEPTION 'Selected creator verification status cannot be changed by the account owner';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_selected_creator_payout_kyc ON public.users;
CREATE TRIGGER protect_selected_creator_payout_kyc
BEFORE UPDATE OF payout_kyc_required, kyc_status ON public.users
FOR EACH ROW EXECUTE FUNCTION public.prevent_selected_creator_kyc_bypass();

DROP TRIGGER IF EXISTS protect_selected_creator_profile_kyc ON public.creator_profiles;
CREATE TRIGGER protect_selected_creator_profile_kyc
BEFORE UPDATE OF kyc_status ON public.creator_profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_selected_creator_kyc_bypass();

-- 4. Trigger to require National ID and selfie before withdrawal/payout can be requested
CREATE OR REPLACE FUNCTION public.require_selected_creator_payout_documents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  creator_uid text;
  requires_kyc boolean;
  id_path text;
  selfie_path text;
BEGIN
  IF NEW.type NOT IN ('payout', 'withdrawal')
     OR NEW.status NOT IN ('pending', 'pending_withdrawal')
  THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.gross_amount, 0) < 1000 THEN
    RAISE EXCEPTION 'The minimum withdrawal amount is KES 1,000';
  END IF;

  creator_uid := COALESCE(NEW.to_creator_id::text, NEW.from_user_id::text);

  SELECT payout_kyc_required, kyc_id_url, kyc_selfie_url
  INTO requires_kyc, id_path, selfie_path
  FROM public.users
  WHERE uid::text = creator_uid;

  IF COALESCE(requires_kyc, false) THEN
    IF id_path IS NULL OR selfie_path IS NULL
       OR NOT EXISTS (
         SELECT 1
         FROM storage.objects
         WHERE bucket_id = 'kyc-documents'
           AND name = id_path
           AND (storage.foldername(name))[1] = creator_uid
       )
       OR NOT EXISTS (
         SELECT 1
         FROM storage.objects
         WHERE bucket_id = 'kyc-documents'
           AND name = selfie_path
           AND (storage.foldername(name))[1] = creator_uid
       )
    THEN
      RAISE EXCEPTION 'Upload your National ID and selfie with ID before requesting a withdrawal';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS require_selected_creator_payout_documents ON public.transactions;
CREATE TRIGGER require_selected_creator_payout_documents
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.require_selected_creator_payout_documents();

-- 5. Return updated records for verification
SELECT
  u.uid,
  u.name,
  u.email,
  u.role,
  u.kyc_status,
  u.is_verified,
  u.payout_kyc_required,
  p.display_name,
  p.is_verified AS profile_verified,
  p.kyc_status AS profile_kyc,
  p.is_active AS profile_active
FROM public.users u
LEFT JOIN public.creator_profiles p ON p.user_id::text = u.uid::text
WHERE u.uid::text IN (SELECT user_id FROM selected_creator_verification_targets);

-- 5. Return updated records for verification
SELECT
  u.uid,
  u.name,
  u.email,
  u.role,
  u.kyc_status,
  u.is_verified,
  u.payout_kyc_required,
  p.display_name,
  p.is_verified AS profile_verified,
  p.kyc_status AS profile_kyc,
  p.is_active AS profile_active
FROM public.users u
LEFT JOIN public.creator_profiles p ON p.user_id::text = u.uid::text
WHERE u.uid::text IN (SELECT user_id FROM selected_creator_verification_targets);
