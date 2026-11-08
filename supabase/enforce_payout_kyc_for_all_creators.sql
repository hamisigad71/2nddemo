-- Enforce KYC verification & documents before withdrawal for ALL creators
-- Disallows payout/withdrawal transaction insert or update if National ID & selfie are missing or unverified.

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

  -- Allow withdrawal only if KYC is verified or valid ID & selfie exist in private storage
  IF COALESCE(user_is_verified, false) = false AND COALESCE(user_kyc_status, '') <> 'verified' THEN
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
