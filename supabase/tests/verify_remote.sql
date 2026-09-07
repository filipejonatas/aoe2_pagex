select jsonb_build_object(
  'public_tables', (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  ),
  'rls_tables', (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  ),
  'players', (select count(*) from public.aoe_players),
  'ratings', (select count(*) from public.player_ratings),
  'directory_backfills', (select jsonb_object_agg(key, row_to_json(state)) from (
    select key, next_start, completed_at, updated_at
    from public.aoe_sync_state
    where key in ('ranked_1v1_directory', 'ranked_team_directory')
  ) state),
  'ratings_by_ladder', (select jsonb_object_agg(leaderboard_id, total) from (
    select leaderboard_id, count(*) as total
    from public.player_ratings
    group by leaderboard_id
  ) ratings),
  'verified_steam_users', (select count(*) from public.users where steam_verified_at is not null),
  'snapshots', (select count(*) from public.rating_snapshots),
  'anon_can_read_players', has_table_privilege('anon', 'public.aoe_players', 'select'),
  'service_role_can_write_players', has_table_privilege('service_role', 'public.aoe_players', 'insert'),
  'cron', (
    select jsonb_agg(jsonb_build_object(
      'jobname', jobname,
      'schedule', schedule,
      'active', active
    ))
    from cron.job
    where jobname = 'sync-aoe-ratings-every-10-minutes'
  )
) as verification;
