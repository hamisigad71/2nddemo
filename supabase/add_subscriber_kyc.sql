-- KYC fields and private evidence storage for subscribers and creators

-- Add kyc_status column with a default of 'unverified'
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'unverified' CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected'));
ALTER TABLE public.users ALTER COLUMN kyc_status SET DEFAULT 'unverified';
UPDATE public.users SET kyc_status = 'unverified' WHERE kyc_status IS NULL;

-- Store private storage object paths, not public URLs, for sensitive identity documents.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_id_url text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_selfie_url text;

-- Add dob to ensure subscribers are 18+
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dob date;

-- Add legal format for Name or ID Number if you want to store it in DB (optional since we have `name`, but specifically `legal_name` and `national_id_number` to differentiate from the profile name)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS national_id_number text;

-- Users may submit their own KYC information; verification status is changed by admins.
DROP POLICY IF EXISTS "Users can update their own KYC details" ON public.users;
CREATE POLICY "Users can update their own KYC details"
ON public.users
FOR UPDATE
USING (auth.uid() = uid)
WITH CHECK (auth.uid() = uid);

CREATE OR REPLACE FUNCTION public.prevent_self_kyc_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND NOT EXISTS (
       SELECT 1 FROM public.users u
       WHERE u.uid = auth.uid()::text AND u.role = 'admin'
     )
     AND (
       NEW.role IS DISTINCT FROM OLD.role
       OR (NEW.kyc_status IS DISTINCT FROM OLD.kyc_status AND NEW.kyc_status = 'verified')
     )
  THEN
    RAISE EXCEPTION 'Only an administrator can change account roles or verify an account';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_kyc_verification ON public.users;
CREATE TRIGGER prevent_self_kyc_verification
BEFORE UPDATE OF kyc_status, role ON public.users
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_kyc_verification();

-- Keep ID images private. Admins can review them using short-lived signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Users upload their own KYC documents" ON storage.objects;
CREATE POLICY "Users upload their own KYC documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users update their own KYC documents" ON storage.objects;
CREATE POLICY "Users update their own KYC documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Owners and admins view KYC documents" ON storage.objects;
CREATE POLICY "Owners and admins view KYC documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.uid = auth.uid()::text AND u.role = 'admin'
    )
  )
);

DROP POLICY IF EXISTS "Owners delete their own KYC documents" ON storage.objects;
CREATE POLICY "Owners delete their own KYC documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
