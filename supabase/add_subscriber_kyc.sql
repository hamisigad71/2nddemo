-- Migration script to add KYC fields to the users table for subscribers

-- Add kyc_status column with a default of 'unverified'
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'unverified' CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- Add kyc_id_url column for storing the URL to the user's ID document (front and back) or an array if you prefer
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_id_url text;

-- Add kyc_selfie_url column for storing the URL to the user's selfie with ID
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_selfie_url text;

-- Add dob to ensure subscribers are 18+
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dob date;

-- Add legal format for Name or ID Number if you want to store it in DB (optional since we have `name`, but specifically `legal_name` and `national_id_number` to differentiate from the profile name)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS national_id_number text;

-- Optional: Create an update policy so users can update their own KYC details
-- Assuming the table already has RLS enabled (from previous setup):
CREATE POLICY "Users can update their own KYC details"
ON public.users
FOR UPDATE
USING (auth.uid() = uid)
WITH CHECK (auth.uid() = uid);

-- Ensure admins can view all users' KYC statuses (Usually covered if you have an admin RLS policy or if functions run under service_role)
