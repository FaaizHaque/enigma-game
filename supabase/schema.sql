-- Enigma Game — Supabase Schema
-- Run this in Supabase SQL Editor: https://app.supabase.com → SQL Editor

-- Sessions table stores entire game state as JSONB
CREATE TABLE IF NOT EXISTS sessions (
  room_code  TEXT PRIMARY KEY,
  data       JSONB        NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

-- Row-Level Security (open access — game uses room codes as the access control)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public session access"
  ON sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable Realtime so clients can subscribe to row changes
ALTER TABLE sessions REPLICA IDENTITY FULL;

-- Add sessions table to the supabase_realtime publication
-- (run this if not already enabled in your Supabase project)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
  END IF;
END $$;

-- Optional: auto-delete sessions older than 24 hours via a cron job
-- Enable pg_cron extension first in Supabase Dashboard → Database → Extensions
-- SELECT cron.schedule('delete-old-sessions', '0 * * * *',
--   $$DELETE FROM sessions WHERE created_at < NOW() - INTERVAL '24 hours'$$);
