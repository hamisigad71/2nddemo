-- ============================================================================
-- 1. FIX: "Infinite recursion detected in policy for relation 'users'"
-- ============================================================================
-- PostgreSQL raises error 42P17 when an RLS policy on public.users queries
-- public.users directly. Using a SECURITY DEFINER helper avoids RLS recursion.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE uid::text = auth.uid()::text
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- Drop ALL existing policies on public.users (including any recursive ones)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
  END LOOP;
END;
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Recreate clean, non-recursive RLS policies on public.users
CREATE POLICY "Public can view users"
  ON public.users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert own record"
  ON public.users
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update own record"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = uid::text OR public.is_admin())
  WITH CHECK (auth.uid()::text = uid::text OR public.is_admin());

CREATE POLICY "Admins can delete users"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- 2. APPROVE & SYNC NIMO (Kikonde Brenda Wali - nimoblip@gmail.com) KYC
-- ============================================================================
-- Her users row had is_verified = true but kyc_status = 'pending', and her
-- creator_profiles row had is_verified = false / kyc_status = 'unverified'.

BEGIN;

SELECT set_config('request.jwt.claim.role', 'service_role', true);

UPDATE public.users
SET kyc_status = 'verified',
    is_verified = true
WHERE uid::text = '51dbc853-ddbd-4b20-9432-2c97f111c64d'
   OR lower(btrim(email)) = 'nimoblip@gmail.com';

UPDATE public.creator_profiles cp
SET kyc_status = 'verified',
    is_verified = true,
    legal_name = COALESCE(u.legal_name, cp.legal_name),
    national_id_number = COALESCE(u.national_id_number, cp.national_id_number),
    kyc_id_url = COALESCE(u.kyc_id_url, cp.kyc_id_url),
    kyc_selfie_url = COALESCE(u.kyc_selfie_url, cp.kyc_selfie_url),
    updated_at = now()
FROM public.users u
WHERE cp.user_id::text = u.uid::text
  AND (u.uid::text = '51dbc853-ddbd-4b20-9432-2c97f111c64d' OR lower(btrim(u.email)) = 'nimoblip@gmail.com');

COMMIT;

-- ============================================================================
-- 3. ENFORCE WITHDRAWAL KYC TRIGGER FOR ALL CREATORS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.require_selected_creator_payout_documents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  creator_uid text;
  id_path text;
  selfie_path text;
  user_kyc_status text;
  user_is_verified boolean;
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

  SELECT kyc_status, is_verified, kyc_id_url, kyc_selfie_url
  INTO user_kyc_status, user_is_verified, id_path, selfie_path
  FROM public.users
  WHERE uid::text = creator_uid;

  -- Strictly disallow payout/withdrawal requests from unverified creator accounts
  IF COALESCE(user_is_verified, false) = false AND COALESCE(user_kyc_status, '') <> 'verified' THEN
    IF id_path IS NULL OR selfie_path IS NULL THEN
      RAISE EXCEPTION 'Identity verification required: upload your National ID and selfie with ID before requesting a withdrawal';
    ELSE
      RAISE EXCEPTION 'Your KYC verification must be approved by an administrator before requesting a withdrawal';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS require_selected_creator_payout_documents ON public.transactions;
CREATE TRIGGER require_selected_creator_payout_documents
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.require_selected_creator_payout_documents();
