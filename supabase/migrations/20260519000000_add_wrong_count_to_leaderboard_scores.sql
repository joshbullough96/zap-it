alter table public.leaderboard_scores
add column if not exists wrong_count integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leaderboard_scores_wrong_count_range'
  ) then
    alter table public.leaderboard_scores
    add constraint leaderboard_scores_wrong_count_range check (wrong_count between 0 and 1000);
  end if;
end $$;
