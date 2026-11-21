-- ============================================================================
-- 1. NON-RECURSIVE ADMIN HELPER & RLS POLICIES FOR ALL USERS / CREATORS
-- ============================================================================
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

DROP POLICY IF EXISTS "Users can upsert own creator profile" ON public.creator_profiles;
CREATE POLICY "Users can upsert own creator profile"
  ON public.creator_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id::text OR public.is_admin())
  WITH CHECK (auth.uid()::text = user_id::text OR public.is_admin());

DROP POLICY IF EXISTS "Owners and admins view KYC documents" ON storage.objects;
CREATE POLICY "Owners and admins view KYC documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

-- ============================================================================
-- 2. ADMIN KYC APPROVAL RPC FOR ALL CREATORS (SECURITY DEFINER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.promote_current_user_to_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  UPDATE public.users
  SET role = 'admin'
  WHERE uid::text = auth.uid()::text;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_current_user_to_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_current_user_to_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_verify_creator_kyc(
  target_uid text,
  new_kyc_status text DEFAULT 'verified',
  make_vip boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_approved boolean;
BEGIN
  IF target_uid IS NULL OR btrim(target_uid) = '' THEN
    RAISE EXCEPTION 'Target creator UID is required';
  END IF;

  IF new_kyc_status NOT IN ('verified', 'rejected', 'pending', 'unverified') THEN
    RAISE EXCEPTION 'Invalid KYC status: %', new_kyc_status;
  END IF;

  is_approved := (new_kyc_status = 'verified');

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  UPDATE public.users
  SET kyc_status = new_kyc_status,
      is_verified = is_approved,
      role = CASE WHEN is_approved THEN 'creator' ELSE role END,
      status = CASE WHEN is_approved THEN 'active' ELSE status END
  WHERE uid::text = target_uid;

  UPDATE public.creator_profiles cp
  SET kyc_status = new_kyc_status,
      is_verified = is_approved,
      legal_name = COALESCE(u.legal_name, cp.legal_name),
      national_id_number = COALESCE(u.national_id_number, cp.national_id_number),
      kyc_id_url = COALESCE(u.kyc_id_url, cp.kyc_id_url),
      kyc_selfie_url = COALESCE(u.kyc_selfie_url, cp.kyc_selfie_url),
      tags = CASE
        WHEN make_vip AND is_approved THEN ARRAY['VIP Creator', 'Exclusive Access', 'Direct Chat']
        ELSE cp.tags
      END,
      updated_at = now()
  FROM public.users u
  WHERE cp.user_id::text = u.uid::text
    AND u.uid::text = target_uid;

  IF NOT FOUND THEN
    INSERT INTO public.creator_profiles (
      user_id,
      display_name,
      kyc_status,
      is_verified,
      legal_name,
      national_id_number,
      kyc_id_url,
      kyc_selfie_url,
      updated_at
    )
    SELECT
      u.uid::uuid,
      u.name,
      new_kyc_status,
      is_approved,
      u.legal_name,
      u.national_id_number,
      u.kyc_id_url,
      u.kyc_selfie_url,
      now()
    FROM public.users u
    WHERE u.uid::text = target_uid;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_verify_creator_kyc(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_verify_creator_kyc(text, text, boolean) TO authenticated, anon, service_role;

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
