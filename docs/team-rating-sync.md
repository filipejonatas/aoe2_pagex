# Team Random Map sync

The application stores AoE II leaderboard data locally and refreshes individual
profiles on demand. Leaderboard `3` is 1v1 Random Map and leaderboard `4` is
Team Random Map.

## Deployment order

1. Apply the database migration:

   ```powershell
   npx.cmd supabase db push --linked
   ```

2. Deploy the multi-ladder Edge Function:

   ```powershell
   npx.cmd supabase functions deploy sync-aoe-ratings --project-ref xsirbxufklylieabbznh
   ```

3. Deploy the backend. It performs on-demand profile enrichment, uses a
   24-hour TTL, coalesces simultaneous refreshes, and records negative results:

   ```powershell
   .\scripts\deploy-cloud-run.ps1 -ProjectId 'aoe2-pagex' -FrontendUrl 'https://aoe2-pagex.vercel.app'
   ```

4. Deploy the frontend:

   ```powershell
   npx.cmd vercel --prod --yes
   ```

5. Start the resumable Team directory backfill only after step 2 succeeds:

   ```powershell
   npm.cmd run backfill:team -w backend -- 60
   ```

The cursor is stored as `ranked_team_directory` in `aoe_sync_state`. Each Edge
Function invocation processes at most `AOE_BACKFILL_PAGES_PER_RUN` pages and
waits at least `AOE_REQUEST_INTERVAL_MS` between upstream calls. Re-running the
command resumes from the last committed cursor.

## Verification

Run:

```powershell
npm.cmd run db:check -w backend
```

`teamRatings` should grow during the backfill, `teamChecks` should grow as
profiles are enriched, and `ranked_team_directory.completedAt` should become
non-null when the import finishes.

For a functional smoke test, open a cached player that previously had no Team
row. The first request may refresh it from World's Edge; following requests
within the TTL use the saved result. A missing record is rendered as `-`, never
as `0-0`.
