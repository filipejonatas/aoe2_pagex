CREATE TABLE "player_ladder_sync" (
  "player_id" UUID NOT NULL,
  "leaderboard_id" INTEGER NOT NULL,
  "checked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "has_data" BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT "player_ladder_sync_pkey" PRIMARY KEY ("player_id", "leaderboard_id"),
  CONSTRAINT "player_ladder_sync_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "aoe_players"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "player_ladder_sync_checked_idx"
  ON "player_ladder_sync"("leaderboard_id", "checked_at");

INSERT INTO "aoe_sync_state" ("key", "next_start")
VALUES ('ranked_team_directory', 1)
ON CONFLICT ("key") DO NOTHING;

ALTER TABLE "player_ladder_sync" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "player_ladder_sync" FROM anon, authenticated;
GRANT ALL ON TABLE "player_ladder_sync" TO service_role;
