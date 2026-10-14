-- Migration: Create platform_ads and ad_applications tables for Admin Ads Portal

CREATE TABLE IF NOT EXISTS platform_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  target_audience TEXT NOT NULL CHECK (target_audience IN ('all', 'users', 'creators')),
  category TEXT NOT NULL DEFAULT 'lifestyle',
  sponsor_name TEXT NOT NULL,
  sponsor_logo TEXT,
  badge TEXT,
  perk_value TEXT,
  cta_text TEXT NOT NULL DEFAULT 'Claim Offer',
  cta_url TEXT NOT NULL DEFAULT '#',
  requirements JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_by UUID
);

-- Enable RLS
ALTER TABLE platform_ads ENABLE ROW LEVEL SECURITY;

-- Allow public / authenticated users to read active ads
CREATE POLICY "Anyone can view active ads" ON platform_ads
  FOR SELECT USING (status = 'active');

-- Allow authenticated admins full control (or all operations for demonstration)
CREATE POLICY "Admins have full access to ads" ON platform_ads
  FOR ALL USING (true) WITH CHECK (true);

-- Creator Applications table for brand deals
CREATE TABLE IF NOT EXISTS ad_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES platform_ads(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL,
  creator_name TEXT,
  creator_handle TEXT,
  pitch TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ad_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators can view and insert applications" ON ad_applications
  FOR ALL USING (true) WITH CHECK (true);

-- Realtime replication
ALTER PUBLICATION supabase_realtime ADD TABLE platform_ads;

