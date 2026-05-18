create table if not exists public.leaderboard_scores (
  id bigint generated always as identity primary key,
  player_name text not null,
  score integer not null,
  zaps_per_second numeric(6, 2) not null,
  elapsed_seconds numeric(7, 2) not null,
  created_at timestamptz not null default now(),
  constraint leaderboard_scores_player_name_length check (char_length(player_name) between 2 and 16),
  constraint leaderboard_scores_player_name_format check (player_name ~ '^[A-Za-z0-9 _-]+$'),
  constraint leaderboard_scores_score_range check (score between 0 and 1000),
  constraint leaderboard_scores_rate_range check (zaps_per_second between 0 and 100),
  constraint leaderboard_scores_elapsed_range check (elapsed_seconds between 0.01 and 600)
);

alter table public.leaderboard_scores enable row level security;

drop policy if exists "leaderboard scores are publicly readable" on public.leaderboard_scores;
create policy "leaderboard scores are publicly readable"
on public.leaderboard_scores
for select
to anon
using (true);

create index if not exists leaderboard_scores_rank_idx
on public.leaderboard_scores (score desc, zaps_per_second desc, created_at asc);
