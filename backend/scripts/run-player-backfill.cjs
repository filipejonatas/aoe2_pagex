require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const maxRuns = Math.max(1, Number(process.argv[2]) || 50);

async function main() {
  const secrets = await prisma.$queryRaw`
    select name, decrypted_secret
    from vault.decrypted_secrets
    where name in ('project_url', 'anon_key', 'aoe_sync_secret')
  `;
  const byName = new Map(secrets.map((secret) => [secret.name, secret.decrypted_secret]));
  const projectUrl = byName.get('project_url');
  const anonKey = byName.get('anon_key');
  const syncSecret = byName.get('aoe_sync_secret');
  if (!projectUrl || !anonKey || !syncSecret) throw new Error('Required Supabase Vault secrets are missing');

  for (let run = 1; run <= maxRuns; run += 1) {
    const [state] = await prisma.$queryRaw`
      select next_start as "nextStart", completed_at as "completedAt"
      from public.aoe_sync_state
      where key = 'ranked_1v1_directory'
    `;
    if (state?.completedAt) {
      console.log(JSON.stringify({ completed: true, nextStart: state.nextStart }));
      return;
    }

    const response = await fetch(`${projectUrl}/functions/v1/sync-aoe-ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        'x-sync-secret': syncSecret,
      },
      body: JSON.stringify({ source: 'manual-backfill', run }),
      signal: AbortSignal.timeout(120_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Backfill run ${run} failed with HTTP ${response.status}: ${JSON.stringify(result)}`);
    console.log(JSON.stringify({ run, directory: result.directory }));
    if (result.directory?.completed) return;
  }

  throw new Error(`Backfill is still incomplete after ${maxRuns} runs`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
