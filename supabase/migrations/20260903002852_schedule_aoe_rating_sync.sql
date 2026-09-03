CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $migration$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid
  INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'sync-aoe-ratings-every-10-minutes';

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'sync-aoe-ratings-every-10-minutes',
    '*/10 * * * *',
    $cron$
      SELECT net.http_post(
        url := (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'project_url'
        ) || '/functions/v1/sync-aoe-ratings',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            SELECT decrypted_secret
            FROM vault.decrypted_secrets
            WHERE name = 'anon_key'
          ),
          'x-sync-secret', (
            SELECT decrypted_secret
            FROM vault.decrypted_secrets
            WHERE name = 'aoe_sync_secret'
          )
        ),
        body := jsonb_build_object('scheduled_at', now())
      );
    $cron$
  );
END
$migration$;
