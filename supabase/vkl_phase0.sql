-- ═══════════════════════════════════════════════════════════════════════════
-- Validation Knowledge Layer (VKL) — Phase 0, Step 1: passive capture
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WHAT THIS IS
--   A new knowledge table plus a database trigger that quietly records every
--   *human-host* answer from multiplayer games into that table. It is pure,
--   additive OBSERVATION: it never changes a game, never changes an answer,
--   and is never read by gameplay. If capture ever fails it is swallowed
--   silently and the game saves exactly as before.
--
-- WHAT IT DOES NOT TOUCH
--   No game code (phone app or web) changes. No existing table changes. The
--   only new behavior is: when Supabase saves a multiplayer game (as it already
--   does today), this trigger copies any newly-answered questions into
--   validation_knowledge.
--
-- SOLO / DAILY (AI) ANSWERS ARE NOT CAPTURED HERE.
--   Those answers are produced in the backend (/api/ask) and never written to
--   any table, so a database trigger cannot see them. Capturing them is Step 2
--   (a small, separate backend change) — deliberately left out for now.
--
-- HOW TO APPLY
--   Supabase Dashboard → SQL Editor → paste this whole file → Run.
--   Safe to re-run: everything is idempotent (IF NOT EXISTS / CREATE OR REPLACE
--   / DROP-then-CREATE).
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. The knowledge table ──────────────────────────────────────────────────
-- Append-only event log. One row per validation. Designed now to hold BOTH
-- host answers (this step) and AI answers (Step 2), so no schema change later.
CREATE TABLE IF NOT EXISTS validation_knowledge (
  id                  BIGSERIAL   PRIMARY KEY,
  secret              TEXT        NOT NULL,               -- the secret, as stored
  secret_norm         TEXT        NOT NULL,               -- normalized, for matching
  normalized_question TEXT        NOT NULL,               -- normalized, for matching
  raw_question        TEXT        NOT NULL,               -- exactly what was asked
  answer              TEXT        NOT NULL CHECK (answer IN ('YES','NO','PARTLY','UNCLEAR')),
  note                TEXT,                               -- optional PARTLY clarifier
  category            TEXT,                               -- e.g. "History"
  source              TEXT        NOT NULL CHECK (source IN ('ai','host')),
  game_mode           TEXT        NOT NULL CHECK (game_mode IN ('solo','daily','multiplayer','unknown')),
  served_from         TEXT        CHECK (served_from IN ('ai','memcache')),  -- AI path only (Step 2)
  facts_hash          TEXT,                               -- fingerprint of the facts context used
  model               TEXT,                               -- e.g. 'gemini-2.5-flash' (AI path only)
  room_code           TEXT,                               -- multiplayer only (no PII)
  question_id         BIGINT,                             -- multiplayer question id (idempotency)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Core lookup: aggregate & (future) serve by secret + normalized question.
CREATE INDEX IF NOT EXISTS idx_vk_lookup  ON validation_knowledge (secret_norm, normalized_question);
-- Time-ordered analysis (hit-rate, dashboards).
CREATE INDEX IF NOT EXISTS idx_vk_created ON validation_knowledge (created_at);
-- Backstop: never record the same host answer for the same room twice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_vk_host_question
  ON validation_knowledge (room_code, question_id)
  WHERE source = 'host' AND room_code IS NOT NULL AND question_id IS NOT NULL;

-- Lock the table down. Unlike sessions/daily_scores, this table is effectively
-- the answer key to the live Daily, so the public (anon) key gets NO access.
-- Only the service role (backend) and the trigger below can read/write it.
ALTER TABLE validation_knowledge ENABLE ROW LEVEL SECURITY;
-- (No GRANTs to anon/authenticated and no permissive policy = deny-all to the
--  publishable key. The service role bypasses RLS; the trigger writes via
--  SECURITY DEFINER as the table owner.)


-- ─── 2. Question / secret normalizer ─────────────────────────────────────────
-- Conservative on purpose: lowercase, strip anything that isn't a letter/digit/
-- space, collapse whitespace, trim. "Is it alive?" -> "is it alive".
-- Keep this IDENTICAL to the JS version added in Step 2 so host and AI answers
-- normalize the same way and aggregate together.
CREATE OR REPLACE FUNCTION vkl_normalize(txt TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT btrim(
           regexp_replace(
             regexp_replace(lower(COALESCE(txt, '')), '[^a-z0-9 ]', ' ', 'g'),
             '\s+', ' ', 'g'
           )
         );
$$;


-- ─── 3. Capture trigger function ─────────────────────────────────────────────
-- Fires after a session is saved. For multiplayer sessions, records any
-- questions that JUST transitioned from unanswered -> YES/NO/PARTLY.
-- SECURITY DEFINER: runs as this function's owner (the table owner) so it can
-- write to the locked-down table even though the client saved as the anon role.
CREATE OR REPLACE FUNCTION vkl_capture_host_answers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret     TEXT;
  v_room       TEXT;
  v_category   TEXT;
  v_facts_hash TEXT;
  q            JSONB;
  old_answer   TEXT;
BEGIN
  -- Multiplayer only: a host-entered secret must be present (lobbies have none).
  v_secret := NEW.data->>'secretAnswer';
  IF v_secret IS NULL OR btrim(v_secret) = '' THEN
    RETURN NEW;
  END IF;

  -- Skip work entirely if the questions list didn't change on this save.
  IF TG_OP = 'UPDATE'
     AND NEW.data->'questions' IS NOT DISTINCT FROM OLD.data->'questions' THEN
    RETURN NEW;
  END IF;

  v_room       := NEW.data->>'roomCode';
  v_category   := NEW.data#>>'{theme,label}';
  v_facts_hash := md5(COALESCE(NEW.data->>'hostFacts', ''));

  FOR q IN
    SELECT value FROM jsonb_array_elements(COALESCE(NEW.data->'questions', '[]'::jsonb))
  LOOP
    -- Only genuine host verdicts. Ignore null, 'SKIP' (host timeout), etc.
    IF (q->>'answer') NOT IN ('YES', 'NO', 'PARTLY') THEN
      CONTINUE;
    END IF;

    -- What was this question's answer before this save? If it was already
    -- answered, it was captured on the earlier save — skip to avoid duplicates.
    old_answer := NULL;
    IF TG_OP = 'UPDATE' THEN
      SELECT oq->>'answer' INTO old_answer
      FROM jsonb_array_elements(COALESCE(OLD.data->'questions', '[]'::jsonb)) AS oq
      WHERE oq->>'id' = q->>'id'
      LIMIT 1;
    END IF;

    IF old_answer IN ('YES', 'NO', 'PARTLY') THEN
      CONTINUE;
    END IF;

    INSERT INTO validation_knowledge (
      secret, secret_norm, normalized_question, raw_question,
      answer, note, category, source, game_mode,
      facts_hash, room_code, question_id
    ) VALUES (
      v_secret,
      vkl_normalize(v_secret),
      vkl_normalize(q->>'text'),
      q->>'text',
      q->>'answer',
      NULLIF(btrim(COALESCE(q->>'note', '')), ''),
      v_category,
      'host',
      'multiplayer',
      v_facts_hash,
      v_room,
      NULLIF(q->>'id', '')::BIGINT
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Capture must NEVER break a game save. Swallow every error.
  RETURN NEW;
END;
$$;


-- ─── 4. Attach the trigger to sessions ───────────────────────────────────────
DROP TRIGGER IF EXISTS trg_vkl_capture_host_answers ON sessions;
CREATE TRIGGER trg_vkl_capture_host_answers
  AFTER INSERT OR UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION vkl_capture_host_answers();


-- ═══════════════════════════════════════════════════════════════════════════
-- INSPECT (run these any time after some multiplayer games have been played):
--
--   -- How much has been captured, by source and mode?
--   SELECT source, game_mode, COUNT(*) FROM validation_knowledge GROUP BY 1, 2;
--
--   -- The 20 most recent captured answers:
--   SELECT created_at, secret, raw_question, answer, category
--   FROM validation_knowledge ORDER BY created_at DESC LIMIT 20;
--
--   -- "Would-have-been-a-cache-hit" rate: how many asks were a repeat of a
--   -- (secret + normalized question) already seen earlier?
--   WITH ordered AS (
--     SELECT ROW_NUMBER() OVER (PARTITION BY secret_norm, normalized_question
--                               ORDER BY created_at) AS occ
--     FROM validation_knowledge)
--   SELECT COUNT(*)                                     AS total_asks,
--          COUNT(*) FILTER (WHERE occ > 1)              AS would_have_hit,
--          ROUND(100.0 * COUNT(*) FILTER (WHERE occ > 1)
--                / NULLIF(COUNT(*), 0), 1)              AS hit_rate_pct
--   FROM ordered;
-- ═══════════════════════════════════════════════════════════════════════════
