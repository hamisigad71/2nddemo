-- Create messages table for 1-on-1 fan <-> creator live chat
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'subscriber', -- 'subscriber' | 'creator'
  content TEXT NOT NULL,
  media_url TEXT,
  is_ppv BOOLEAN DEFAULT FALSE,
  ppv_price NUMERIC DEFAULT 0,
  ppv_unlocked BOOLEAN DEFAULT FALSE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for speedy thread loading
CREATE INDEX IF NOT EXISTS idx_messages_creator_receiver ON messages (creator_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages (sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at ASC);

-- Enable Supabase Realtime for instant message push
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

