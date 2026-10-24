-- Grant verified discovery status to only the three named creator accounts.
-- Their ID and selfie files are required before any payout can be requested.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS payout_kyc_required boolean NOT NULL DEFAULT false;

-- Ensure the names resolve to exactly one creator account each before changing
-- any account, so an unexpected production dataset fails closed.
DO $$
DECLARE
  target_name text;
  matching_count integer;
BEGIN
  FOREACH target_name IN ARRAY ARRAY['fatma loki', 'natalia ngina', 'ella rains']
  LOOP
    SELECT count(*)
    INTO matching_count
    FROM public.users
    WHERE lower(btrim(name)) = target_name
      AND role IN ('creator', 'pending_creator');

    IF matching_count <> 1 THEN
      RAISE EXCEPTION
        'Expected exactly one creator account named "%", found %; no selected account changes were applied.',
        target_name,
        matching_count;
    END IF;
  END LOOP;
END;
$$;

-- Existing self-verification protection treats this migration like a service
-- operation. The setting is transaction-local and does not change app roles.
SELECT set_config('request.jwt.claim.role', 'service_role', true);

UPDATE public.users
SET kyc_status = 'verified',
    is_verified = true,
    payout_kyc_required = true
WHERE lower(btrim(name)) IN ('fatma loki', 'natalia ngina', 'ella rains')
  AND role IN ('creator', 'pending_creator');

UPDATE public.creator_profiles AS profiles
SET kyc_status = 'verified',
    is_verified = true
FROM public.users AS users
WHERE profiles.user_id::text = users.uid::text
  AND users.payout_kyc_required = true;

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
    IF TG_TABLE_NAME = 'users'
       AND NEW.payout_kyc_required IS DISTINCT FROM OLD.payout_kyc_required
    THEN
      RAISE EXCEPTION 'Only an administrator can change payout identity requirements';
    END IF;

    IF TG_TABLE_NAME = 'users'
       AND OLD.payout_kyc_required
       AND NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
    THEN
      RAISE EXCEPTION 'Selected creator verification status cannot be changed by the account owner';
    END IF;

    IF TG_TABLE_NAME = 'creator_profiles'
       AND NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
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
