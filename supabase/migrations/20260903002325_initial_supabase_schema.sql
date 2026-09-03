-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "league_visibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "snapshot_source" AS ENUM ('WORLDS_EDGE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aoe_players" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "profile_id" TEXT NOT NULL,
    "steam_id" TEXT,
    "nickname" TEXT NOT NULL,
    "country" TEXT,
    "last_sync_attempt_at" TIMESTAMPTZ(3),
    "next_sync_at" TIMESTAMPTZ(3),
    "sync_failures" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aoe_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_ratings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id" UUID NOT NULL,
    "leaderboard_id" INTEGER NOT NULL,
    "rating" INTEGER,
    "global_rank" INTEGER,
    "peak_rating" INTEGER,
    "wins" INTEGER,
    "losses" INTEGER,
    "games" INTEGER,
    "last_match_at" TIMESTAMPTZ(3),
    "last_synced_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leagues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" UUID NOT NULL,
    "invite_code" TEXT NOT NULL,
    "visibility" "league_visibility" NOT NULL,
    "leaderboard_id" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "league_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id" UUID NOT NULL,
    "leaderboard_id" INTEGER NOT NULL,
    "rating" INTEGER,
    "global_rank" INTEGER,
    "wins" INTEGER,
    "losses" INTEGER,
    "games" INTEGER,
    "source" "snapshot_source" NOT NULL DEFAULT 'WORLDS_EDGE',
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rating_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "aoe_players_user_id_key" ON "aoe_players"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "aoe_players_profile_id_key" ON "aoe_players"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "aoe_players_steam_id_key" ON "aoe_players"("steam_id");

-- CreateIndex
CREATE INDEX "aoe_players_due_sync_idx" ON "aoe_players"("next_sync_at");

-- CreateIndex
CREATE INDEX "aoe_players_nickname_idx" ON "aoe_players"("nickname");

-- CreateIndex
CREATE INDEX "player_ratings_leaderboard_rating_idx" ON "player_ratings"("leaderboard_id", "rating" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "player_ratings_player_id_leaderboard_id_key" ON "player_ratings"("player_id", "leaderboard_id");

-- CreateIndex
CREATE UNIQUE INDEX "leagues_slug_key" ON "leagues"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "leagues_invite_code_key" ON "leagues"("invite_code");

-- CreateIndex
CREATE INDEX "leagues_owner_id_idx" ON "leagues"("owner_id");

-- CreateIndex
CREATE INDEX "league_members_league_id_idx" ON "league_members"("league_id");

-- CreateIndex
CREATE INDEX "league_members_player_id_idx" ON "league_members"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "league_members_league_id_player_id_key" ON "league_members"("league_id", "player_id");

-- CreateIndex
CREATE INDEX "rating_snapshots_history_idx" ON "rating_snapshots"("player_id", "leaderboard_id", "recorded_at" DESC);

-- AddForeignKey
ALTER TABLE "aoe_players" ADD CONSTRAINT "aoe_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_ratings" ADD CONSTRAINT "player_ratings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "aoe_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "aoe_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating_snapshots" ADD CONSTRAINT "rating_snapshots_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "aoe_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase hardening and cached nickname search.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX "aoe_players_nickname_trgm_idx"
ON "aoe_players" USING GIN ("nickname" extensions.gin_trgm_ops);

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aoe_players" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "player_ratings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leagues" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "league_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rating_snapshots" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  "users",
  "aoe_players",
  "player_ratings",
  "leagues",
  "league_members",
  "rating_snapshots"
FROM anon, authenticated;

GRANT ALL ON TABLE
  "users",
  "aoe_players",
  "player_ratings",
  "leagues",
  "league_members",
  "rating_snapshots"
TO service_role;
