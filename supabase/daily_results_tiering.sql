-- ─── Daily Challenge: tier-aware results + stable identity ─────────────────────
-- Run this ONCE in the Supabase SQL editor BEFORE the matching server deploy.
--
-- Context: the mobile app reaches daily results only through the server
-- endpoints (/api/daily-result, /api/daily-leaderboard), which use the
-- service-role key. `daily_results` was created server-side and isn't otherwise
-- version-controlled, so this migration both declares it (safe on a fresh
-- project) and extends it for Junior dailies + the upcoming weekly leaderboard.
--
-- Everything here is idempotent and backward-compatible: existing rows keep
-- working because `tier` backfills to 'scholar' and `player_id` stays NULL.

-- Declare the table so a fresh project has it; a no-op where it already exists.
CREATE TABLE IF NOT EXISTS public.daily_results (
  id             BIGSERIAL   PRIMARY KEY,
  player_name    TEXT        NOT NULL,
  challenge_date TEXT        NOT NULL,          -- 'YYYY-MM-DD'
  solved         BOOLEAN     NOT NULL DEFAULT FALSE,
  questions_used INTEGER     NOT NULL DEFAULT 0,
  time_seconds   INTEGER     NOT NULL DEFAULT 0,
  secret         TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- New columns. Existing rows become Scholar with a NULL identity, which keeps
-- the historical Scholar leaderboard intact.
ALTER TABLE public.daily_results ADD COLUMN IF NOT EXISTS tier      TEXT NOT NULL DEFAULT 'scholar';
ALTER TABLE public.daily_results ADD COLUMN IF NOT EXISTS player_id UUID;

-- Daily leaderboard reads by (tier, date); weekly aggregation reads a date range
-- per tier and groups by player_id.
CREATE INDEX IF NOT EXISTS idx_daily_results_tier_date ON public.daily_results(tier, challenge_date);
CREATE INDEX IF NOT EXISTS idx_daily_results_player    ON public.daily_results(player_id, tier, challenge_date);

-- One authoritative result per player/tier/day (first attempt wins). Partial so
-- legacy rows without a player_id are unaffected. The server also checks first,
-- so this is mainly a race-condition guard.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_daily_player_day
  ON public.daily_results(player_id, tier, challenge_date) WHERE player_id IS NOT NULL;
