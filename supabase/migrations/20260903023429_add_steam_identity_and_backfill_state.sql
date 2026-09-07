ALTER TABLE "users"
  ADD COLUMN "steam_id" TEXT,
  ADD COLUMN "steam_verified_at" TIMESTAMPTZ(3);

CREATE UNIQUE INDEX "users_steam_id_key" ON "users"("steam_id");

CREATE TABLE "aoe_sync_state" (
  "key" TEXT PRIMARY KEY,
  "next_start" INTEGER NOT NULL DEFAULT 1,
  "completed_at" TIMESTAMPTZ(3),
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "aoe_sync_state_next_start_positive" CHECK ("next_start" > 0)
);

INSERT INTO "aoe_sync_state" ("key", "next_start")
VALUES ('ranked_1v1_directory', 1)
ON CONFLICT ("key") DO NOTHING;

ALTER TABLE "aoe_sync_state" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "aoe_sync_state" FROM anon, authenticated;
GRANT ALL ON TABLE "aoe_sync_state" TO service_role;
