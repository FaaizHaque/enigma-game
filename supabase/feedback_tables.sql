-- ─── "Help Improve 20Q" feedback tables ──────────────────────────────────────
-- Run this once in the Supabase SQL editor.
--
-- Two tables:
--   secret_suggestions  — player-submitted secrets to add to the library
--   ai_answer_reports   — player reports of wrong/unclear AI validations
--
-- Both are insert-only from the app (anon key). Review them in the Supabase
-- Table Editor; use the `status` column to track what you've processed.

create table if not exists public.secret_suggestions (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid,
  tier           text not null,                 -- 'scholar' | 'junior'
  category_id    text not null,                 -- e.g. 'personality', 'animals'
  category_label text,                          -- e.g. 'Famous Personality'
  secret         text not null,
  note           text,
  status         text not null default 'new',   -- new | reviewed | added | rejected
  created_at     timestamptz not null default now()
);

create table if not exists public.ai_answer_reports (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid,
  secret      text,                             -- what was being guessed (may be null)
  question    text not null,
  ai_answer   text,                             -- YES | NO | PARTLY (as reported)
  reason      text not null,                    -- yes | no | unclear | misunderstood
  comments    text,
  status      text not null default 'new',      -- new | reviewed | actioned | dismissed
  created_at  timestamptz not null default now()
);

-- Row Level Security: allow anonymous INSERT only (the app uses the anon key).
-- No public SELECT/UPDATE/DELETE — you review via the dashboard (service role).
alter table public.secret_suggestions enable row level security;
alter table public.ai_answer_reports  enable row level security;

drop policy if exists "anon insert suggestions" on public.secret_suggestions;
create policy "anon insert suggestions"
  on public.secret_suggestions for insert to anon with check (true);

drop policy if exists "anon insert reports" on public.ai_answer_reports;
create policy "anon insert reports"
  on public.ai_answer_reports for insert to anon with check (true);

-- ─── General feedback (bugs / ideas / other) ──────────────────────────────────
create table if not exists public.general_feedback (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid,
  kind        text not null,                    -- 'bug' | 'idea' | 'other'
  message     text not null,
  status      text not null default 'new',      -- new | reviewed | actioned | dismissed
  created_at  timestamptz not null default now()
);

alter table public.general_feedback enable row level security;

drop policy if exists "anon insert general feedback" on public.general_feedback;
create policy "anon insert general feedback"
  on public.general_feedback for insert to anon with check (true);
