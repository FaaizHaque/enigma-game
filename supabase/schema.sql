-- Enigma Game — Supabase Schema
-- Run this in Supabase SQL Editor: https://app.supabase.com → SQL Editor

-- Sessions table stores entire game state as JSONB
CREATE TABLE IF NOT EXISTS sessions (
  room_code  TEXT PRIMARY KEY,
  data       JSONB        NOT NULL,
  is_public  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- For existing databases: add is_public if missing
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

-- Partial index for the Public Rooms browser (only public lobbies are queried)
CREATE INDEX IF NOT EXISTS idx_sessions_public ON sessions(created_at DESC) WHERE is_public = TRUE;

-- Row-Level Security (open access — game uses room codes as the access control)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public session access"
  ON sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Explicit Data API grants. As of 2026, Supabase no longer auto-grants
-- public-schema tables to the anon/authenticated roles (default for new
-- projects 30 May 2026; enforced on existing projects 30 Oct 2026).
-- Without these GRANTs, supabase-js requests using the publishable
-- (anon) key are rejected even though RLS allows them.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO anon, authenticated;

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

-- Daily challenge scores
CREATE TABLE IF NOT EXISTS daily_scores (
  id          BIGSERIAL    PRIMARY KEY,
  date        TEXT         NOT NULL,
  player_name TEXT         NOT NULL,
  avatar_idx  INTEGER      NOT NULL DEFAULT 0,
  questions   INTEGER      NOT NULL,
  solved      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_scores_date ON daily_scores(date, questions ASC);

ALTER TABLE daily_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public daily score access"
  ON daily_scores FOR ALL
  USING (true)
  WITH CHECK (true);

-- Data API grants (see note on sessions above). daily_scores uses a
-- BIGSERIAL id, so the underlying sequence must be granted too or
-- INSERTs fail with "permission denied for sequence".
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_scores TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE daily_scores;

-- ─── Player profiles (device UUID for now; upgradeable to Apple/Google auth) ──
CREATE TABLE IF NOT EXISTS player_profiles (
  id         UUID         PRIMARY KEY,  -- generated on device first launch
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public player profile access"
  ON player_profiles FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON player_profiles TO anon, authenticated;

-- ─── Seen secrets (dedup history per player per library tier) ─────────────────
CREATE TABLE IF NOT EXISTS player_seen_secrets (
  player_id  UUID         NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  secret     TEXT         NOT NULL,
  tier       TEXT         NOT NULL CHECK (tier IN ('scholar', 'junior')),
  seen_at    TIMESTAMPTZ  DEFAULT NOW(),
  PRIMARY KEY (player_id, secret, tier)
);

CREATE INDEX IF NOT EXISTS idx_seen_player_tier ON player_seen_secrets(player_id, tier, seen_at DESC);

ALTER TABLE player_seen_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public seen secrets access"
  ON player_seen_secrets FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON player_seen_secrets TO anon, authenticated;

-- Optional: auto-delete sessions older than 24 hours via a cron job
-- Enable pg_cron extension first in Supabase Dashboard → Database → Extensions
-- SELECT cron.schedule('delete-old-sessions', '0 * * * *',
--   $$DELETE FROM sessions WHERE created_at < NOW() - INTERVAL '24 hours'$$);
