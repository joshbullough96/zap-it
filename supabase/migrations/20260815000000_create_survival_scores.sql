create table if not exists public.survival_scores (
  id bigint generated always as identity primary key,
  player_name text not null,
  score integer not null,
  zaps_per_second numeric(6, 2) not null,
  elapsed_seconds numeric(8, 2) not null,
  wrong_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint survival_scores_player_name_length check (char_length(player_name) between 2 and 16),
  constraint survival_scores_player_name_format check (player_name ~ '^[A-Za-z0-9 _-]+$'),
  constraint survival_scores_score_range check (score between 0 and 10000),
  constraint survival_scores_rate_range check (zaps_per_second between 0 and 100),
  constraint survival_scores_elapsed_range check (elapsed_seconds between 0.01 and 36000),
  constraint survival_scores_wrong_count_range check (wrong_count between 0 and 1000)
);

alter table public.survival_scores enable row level security;

drop policy if exists "survival scores are publicly readable" on public.survival_scores;
create policy "survival scores are publicly readable"
on public.survival_scores
for select
to anon
using (true);

create index if not exists survival_scores_rank_idx
on public.survival_scores (score desc, zaps_per_second desc, created_at asc);
