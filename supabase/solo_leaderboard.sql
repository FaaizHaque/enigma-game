-- ─── Solo Leaderboard ─────────────────────────────────────────────────────────
-- Run this once in the Supabase SQL editor.
--
-- One aggregate row per player per tier. The server (service role) is the only
-- writer; points are computed server-side so the client can't inflate them.
--   total_points — all-time
--   week_points  — points earned in the current week only (week_start = its Monday)
-- The weekly board is read with `where week_start = <this Monday>`, so last
-- week's totals simply drop off — no cron/reset job needed.

create table if not exists public.solo_scores (
  player_id    uuid not null,
  tier         text not null,                 -- 'scholar' | 'junior'
  player_name  text,
  avatar_idx   int  not null default 0,
  total_points int  not null default 0,
  week_points  int  not null default 0,
  week_start   date,                           -- Monday of the week week_points covers
  updated_at   timestamptz not null default now(),
  primary key (player_id, tier)
);

create index if not exists solo_scores_tier_total
  on public.solo_scores (tier, total_points desc);
create index if not exists solo_scores_tier_week
  on public.solo_scores (tier, week_start, week_points desc);

-- Atomic upsert: add points to the all-time total, and to the week (resetting the
-- weekly tally when a new week has started).
create or replace function public.record_solo_score(
  p_player_id uuid,
  p_tier      text,
  p_name      text,
  p_avatar    int,
  p_points    int
) returns void
language plpgsql
as $$
declare
  v_monday date := date_trunc('week', (now() at time zone 'utc'))::date;
begin
  insert into public.solo_scores
    (player_id, tier, player_name, avatar_idx, total_points, week_points, week_start, updated_at)
  values
    (p_player_id, p_tier, p_name, p_avatar, p_points, p_points, v_monday, now())
  on conflict (player_id, tier) do update set
    total_points = public.solo_scores.total_points + p_points,
    week_points  = case when public.solo_scores.week_start = v_monday
                        then public.solo_scores.week_points + p_points
                        else p_points end,
    week_start   = v_monday,
    player_name  = coalesce(p_name, public.solo_scores.player_name),
    avatar_idx   = p_avatar,
    updated_at   = now();
end;
$$;

-- Row Level Security: no direct client access. All reads and writes go through
-- the Express server using the service-role key (which bypasses RLS).
alter table public.solo_scores enable row level security;
