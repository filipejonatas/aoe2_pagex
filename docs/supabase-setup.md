# Supabase setup

The application uses Supabase Postgres through Prisma. Authentication remains in the NestJS API for the MVP. Browser clients never receive the database password or service-role key.

## Runtime architecture

- Next.js calls NestJS.
- NestJS reads and writes the application database through the Supavisor transaction pooler.
- `sync-aoe-ratings`, a Supabase Edge Function, is the only component that calls the unofficial AoE2 API.
- Supabase Cron invokes that function every 10 minutes.
- The function refreshes the top 200 1v1 Random Map players and refreshes linked profiles outside that range in batches of at most 10 IDs.
- The site serves cached rows from Postgres even when the upstream API is unavailable.

Queues are intentionally not required for the first deployment. Add Supabase Queues (`pgmq`) when ingestion must fan out across many thousands of profiles or needs per-message retries and dead-letter handling.

## Database connections

Copy `backend/.env.example` to `backend/.env` and obtain both connection strings from **Supabase Dashboard → Connect**:

- `DATABASE_URL`: Supavisor transaction pooler on port `6543`, used by the running API.
- `DIRECT_URL`: session pooler on port `5432`, reserved for direct schema tooling.

Do not enable prepared statements through the transaction pooler. Never commit database passwords.

## Migration workflow

Create a named Supabase migration, generate the Prisma schema diff into that file, review the SQL, and deploy it through the linked Supabase CLI:

```bash
npm run db:generate -w backend
npx supabase migration new descriptive_change_name
npx prisma migrate diff --from-empty --to-schema-datamodel backend/prisma/schema.prisma --script --output supabase/migrations/<generated_name>.sql
npx supabase db push --linked --dry-run --skip-vault
npx supabase db push --linked --skip-vault
```

For changes after the initial schema, diff the current migration state instead of using `--from-empty`.

The reviewed migration must also:

1. Enable RLS on `users`, `aoe_players`, `player_ratings`, `leagues`, `league_members`, and `rating_snapshots`.
2. Revoke table access from `anon` and `authenticated`. Access is through NestJS; the Edge Function uses the service role.
3. Enable `pg_trgm` and create a GIN trigram index on `aoe_players.nickname` for the cached player search.
4. Enable `pg_cron`, `pg_net`, and Vault, then register the scheduled invocation after its secrets exist.

Do not use `prisma db push` against the hosted project. Production changes must be represented by reviewed migration files.

## Edge Function secrets

Copy `supabase/functions/.env.example` only for local development. Hosted values are configured with the Supabase CLI:

```bash
npx supabase secrets set AOE_SYNC_SECRET="<random-secret>" AOE_API_USER_AGENT="AoE2CommunityLeague/0.1 (contact: owner@example.com)" AOE_API_BASE_URLS="https://aoe-api.worldsedgelink.com/community"
npx supabase functions deploy sync-aoe-ratings
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied to hosted Edge Functions by Supabase. The service-role key must never be sent to a browser or stored in source control.

For Cron, store `project_url`, `anon_key`, and the same `aoe_sync_secret` in Supabase Vault. The scheduled HTTP request sends the anon JWT in `Authorization` and the worker secret in `x-sync-secret`. Keep JWT verification enabled for the function.

## MCP

The Codex MCP server is OAuth-authenticated and scoped to project `xsirbxufklylieabbznh`. Its approved scopes are `projects:read`, `database:read`, `database:write`, `analytics:read`, `edge_functions:read`, and `edge_functions:write`; it has no secret, storage, organization, or cross-project access. Restart Codex after first-time setup if its tools are not visible in the current session. MCP access does not replace migrations: schema changes still need a reviewed, versioned SQL file before they are applied.

## Upstream API contract

The integration follows the community API guide and treats the API as unstable:

- `getLeaderBoard2` populates the local leaderboard cache.
- `getPersonalStat` receives only one identifier type and at most 10 profile IDs per request.
- `statGroups` are joined to `leaderboardStats` through `statgroup_id`; they are not independent player records.
- Requests are sequential, use an identifying User-Agent, time out, and retry 429/5xx responses with exponential backoff and jitter.

Reference: <https://github.com/ustacode/aoe2-apis/blob/main/docs/07-build-your-own.md>
