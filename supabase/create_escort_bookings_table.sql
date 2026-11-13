-- Create escort_bookings table for Escrow Protection bookings
CREATE TABLE IF NOT EXISTS public.escort_bookings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES public.users(uid) ON DELETE CASCADE,
    escort_id uuid REFERENCES public.users(uid) ON DELETE CASCADE,
    booking_date date NOT NULL,
    start_time time NOT NULL,
    duration_hours integer NOT NULL DEFAULT 1,
    location text NOT NULL,
    meeting_type text NOT NULL DEFAULT 'outcall', -- 'incall' | 'outcall' | 'dinner' | 'event'
    special_notes text,
    
    -- Financials (KES)
    total_amount numeric NOT NULL,
    platform_fee numeric NOT NULL,
    escort_earnings numeric NOT NULL,
    mpesa_reference text,
    
    -- Escrow Status
    status text NOT NULL DEFAULT 'escrow_pending' 
        CHECK (status IN (
            'escrow_pending', 
            'escrow_funded', 
            'accepted', 
            'declined', 
            'in_progress', 
            'completed', 
            'disputed', 
            'refunded'
        )),
        
    client_checked_in boolean DEFAULT false,
    escort_checked_in boolean DEFAULT false,
    funds_released_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table to track Pay-to-Unlock Direct Contact & Chat (KES 1,300)
CREATE TABLE IF NOT EXISTS public.escort_contact_unlocks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES public.users(uid) ON DELETE CASCADE,
    escort_id uuid REFERENCES public.users(uid) ON DELETE CASCADE,
    amount_paid numeric NOT NULL DEFAULT 1300,
    mpesa_reference text,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(client_id, escort_id)
);

-- Enable RLS
ALTER TABLE public.escort_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escort_contact_unlocks ENABLE ROW LEVEL SECURITY;

-- Escort bookings policies
CREATE POLICY "Users can view their own bookings as client or escort"
ON public.escort_bookings FOR SELECT
USING (auth.uid() = client_id OR auth.uid() = escort_id);

CREATE POLICY "Clients can create bookings"
ON public.escort_bookings FOR INSERT
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Parties can update their own bookings"
ON public.escort_bookings FOR UPDATE
USING (auth.uid() = client_id OR auth.uid() = escort_id);

-- Contact unlocks policies
CREATE POLICY "Users can view contact unlocks they paid for or received"
ON public.escort_contact_unlocks FOR SELECT
USING (auth.uid() = client_id OR auth.uid() = escort_id);

CREATE POLICY "Users can insert contact unlock records"
ON public.escort_contact_unlocks FOR INSERT
WITH CHECK (auth.uid() = client_id);
