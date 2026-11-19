-- Fix KYC verification trigger to allow unverified creators to submit KYC documents to 'pending'
-- Previously, protect_selected_creator_payout_kyc blocked any user with payout_kyc_required=true
-- from changing kyc_status from 'unverified' to 'pending'.

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

      -- Block account owner ONLY if they were ALREADY verified and try to modify verification
      IF OLD.payout_kyc_required
         AND OLD.kyc_status = 'verified'
         AND NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
      THEN
        RAISE EXCEPTION 'Verified creator status cannot be modified by the account owner';
      END IF;
    ELSIF TG_TABLE_NAME = 'creator_profiles' THEN
      IF OLD.kyc_status = 'verified'
         AND NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
         AND EXISTS (
           SELECT 1
           FROM public.users selected_user
           WHERE selected_user.uid::text = OLD.user_id::text
             AND selected_user.payout_kyc_required
         )
      THEN
        RAISE EXCEPTION 'Verified creator status cannot be modified by the account owner';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
