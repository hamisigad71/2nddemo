BEGIN;

SELECT set_config('request.jwt.claim.role', 'service_role', true);

DO $$
DECLARE
  target_uid text;
  matching_accounts integer;
BEGIN
  SELECT count(*), min(uid::text)
  INTO matching_accounts, target_uid
  FROM public.users
  WHERE lower(btrim(email)) = 'nimoblip@gmail.com';

  IF matching_accounts <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one Nimo account for nimoblip@gmail.com, found %; no changes were applied.',
      matching_accounts;
  END IF;

  UPDATE public.users
  SET kyc_status = 'verified',
      is_verified = true
  WHERE uid::text = target_uid;

  INSERT INTO public.creator_profiles (
    user_id,
    display_name,
    is_active,
    is_verified,
    kyc_status,
    updated_at
  )
  SELECT
    uid::text,
    name,
    true,
    true,
    'verified',
    now()
  FROM public.users
  WHERE uid::text = target_uid
  ON CONFLICT (user_id) DO UPDATE
  SET is_active = true,
      is_verified = true,
      kyc_status = 'verified',
      updated_at = now();
END;
$$;

COMMIT;
