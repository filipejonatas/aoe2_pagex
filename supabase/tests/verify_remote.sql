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
