-- Create escort_applications table
CREATE TABLE IF NOT EXISTS public.escort_applications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    name text,
    bio text,
    age integer,
    location text,
    measurements text,
    rates text,
    photos text[],
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Note: Depending on your exact "users" table name (it might be "auth.users" or "public.users"),
-- you might need to adjust the REFERENCE above. Assuming public.users for now based on standard setups
-- or if this is a custom profile table.

-- Add is_escort boolean to users if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_escort boolean DEFAULT false;

-- Enable Row Level Security (RLS)
ALTER TABLE public.escort_applications ENABLE ROW LEVEL SECURITY;

-- Policies for escort_applications
CREATE POLICY "Creators can view their own applications" 
ON public.escort_applications FOR SELECT 
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can insert their own applications" 
ON public.escort_applications FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

-- Depending on your admin setup, you might need a policy for admins to view and update applications
-- Example (if admins have a specific role or are checked in your edge functions, they will bypass RLS typically if using service_role key)
-- If checking via JWT claim:
CREATE POLICY "Admins can view and update all applications"
ON public.escort_applications FOR ALL
USING ( (select (auth.jwt() ->> 'role')) = 'admin' );
