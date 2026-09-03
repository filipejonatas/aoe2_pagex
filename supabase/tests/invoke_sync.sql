select net.http_post(
  url := (
    select decrypted_secret
    from vault.decrypted_secrets
    where name = 'project_url'
  ) || '/functions/v1/sync-aoe-ratings',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'anon_key'
    ),
    'x-sync-secret', (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'aoe_sync_secret'
    )
  ),
  body := jsonb_build_object('manual_validation_at', now())
) as request_id;
