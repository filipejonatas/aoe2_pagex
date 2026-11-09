-- Tracks when the sync worker last wrote a rating_snapshots row for each
-- player/ladder, so deduplication no longer has to read the snapshot history
-- (that read was capped at 1000 rows by PostgREST and let duplicates through).
ALTER TABLE "player_ratings" ADD COLUMN IF NOT EXISTS "last_snapshot_at" TIMESTAMPTZ(3);

UPDATE "player_ratings" pr
SET "last_snapshot_at" = latest."recorded_at"
FROM (
  SELECT "player_id", "leaderboard_id", MAX("recorded_at") AS "recorded_at"
  FROM "rating_snapshots"
  GROUP BY "player_id", "leaderboard_id"
) latest
WHERE latest."player_id" = pr."player_id"
  AND latest."leaderboard_id" = pr."leaderboard_id";
