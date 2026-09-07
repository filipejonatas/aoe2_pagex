import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.114.0";
import { normalizeRatings, type NormalizedRating } from "../_shared/aoe-payload.ts";

const LEADERBOARD_SIZE = 200;
const PERSONAL_BATCH_SIZE = 10;
const LINKED_PLAYERS_PER_RUN = 20;
const LADDERS = [
  { id: 3, key: "oneVsOne", stateKey: "ranked_1v1_directory" },
  { id: 4, key: "team", stateKey: "ranked_team_directory" },
] as const;
const BACKFILL_PAGES_PER_RUN = Math.min(10, Math.max(1, Number(Deno.env.get("AOE_BACKFILL_PAGES_PER_RUN")) || 5));
const AOE_REQUEST_INTERVAL_MS = Math.max(250, Number(Deno.env.get("AOE_REQUEST_INTERVAL_MS")) || 350);
const SYNC_INTERVAL_MS = 60 * 60 * 1_000;
const SNAPSHOT_INTERVAL_MS = 24 * 60 * 60 * 1_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

let nextAoERequestAt = 0;
let aoeRateLimitQueue: Promise<void> = Promise.resolve();

function waitForAoERateLimit() {
  const turn = aoeRateLimitQueue.then(async () => {
    const remaining = nextAoERequestAt - Date.now();
    if (remaining > 0) await sleep(remaining);
    nextAoERequestAt = Date.now() + AOE_REQUEST_INTERVAL_MS;
  });
  aoeRateLimitQueue = turn.catch(() => undefined);
  return turn;
}

async function requestAoE(path: string): Promise<unknown> {
  const hosts = (Deno.env.get("AOE_API_BASE_URLS") ?? "https://aoe-api.worldsedgelink.com/community")
    .split(",")
    .map((host) => host.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const userAgent = Deno.env.get("AOE_API_USER_AGENT");
  if (!userAgent) throw new Error("AOE_API_USER_AGENT is required");

  let lastError: unknown;
  for (const host of hosts) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await waitForAoERateLimit();
        const response = await fetch(`${host}${path}`, {
          headers: { "user-agent": userAgent, accept: "application/json" },
          signal: AbortSignal.timeout(12_000),
        });
        if (response.ok) return await response.json();
        if (response.status !== 429 && response.status < 500) {
          throw new Error(`AoE API returned HTTP ${response.status}`);
        }
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter)
          ? retryAfter * 1_000
          : 500 * 2 ** attempt + Math.floor(Math.random() * 250);
        await sleep(delay);
      } catch (error) {
        lastError = error;
        if (attempt < 2) await sleep(500 * 2 ** attempt + Math.floor(Math.random() * 250));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AoE API is unavailable");
}

async function fetchLeaderboardPage(leaderboardId: number, start = 1, count = LEADERBOARD_SIZE): Promise<NormalizedRating[]> {
  const query = new URLSearchParams({
    title: "age2",
    leaderboard_id: String(leaderboardId),
    start: String(start),
    count: String(count),
  });
  return normalizeRatings(await requestAoE(`/leaderboard/getLeaderBoard2?${query}`));
}

async function fetchProfiles(profileIds: string[]): Promise<NormalizedRating[]> {
  if (!profileIds.length) return [];
  if (profileIds.some((id) => !/^\d+$/.test(id))) throw new Error("Invalid AoE profile ID");
  const query = new URLSearchParams({
    title: "age2",
    profile_ids: `[${profileIds.join(",")}]`,
  });
  return normalizeRatings(await requestAoE(`/leaderboard/getPersonalStat?${query}`));
}

const chunks = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size));

async function persistRatings(
  supabase: SupabaseClient,
  rows: NormalizedRating[],
  now: Date,
  options: { createSnapshots?: boolean } = {},
) {
  if (!rows.length) return { players: 0, snapshots: 0 };
  const uniquePlayers = [...new Map(rows.map((row) => [row.profileId, row])).values()];
  const uniqueRatings = [...new Map(rows.map((row) => [`${row.profileId}:${row.leaderboardId}`, row])).values()];
  const profileIds = uniquePlayers.map((row) => row.profileId);

  const { error: playerError } = await supabase.from("aoe_players").upsert(
    uniquePlayers.map((row) => ({
      profile_id: row.profileId,
      steam_id: row.steamId,
      nickname: row.nickname,
      country: row.country,
      last_sync_attempt_at: now.toISOString(),
      next_sync_at: new Date(now.getTime() + SYNC_INTERVAL_MS).toISOString(),
      sync_failures: 0,
      updated_at: now.toISOString(),
    })),
    { onConflict: "profile_id" },
  );
  if (playerError) throw playerError;

  const { data: players, error: readPlayersError } = await supabase
    .from("aoe_players")
    .select("id,profile_id")
    .in("profile_id", profileIds);
  if (readPlayersError) throw readPlayersError;
  const playerIdByProfile = new Map(players.map((player) => [player.profile_id, player.id]));
  const playerIds = players.map((player) => player.id);

  const createSnapshots = options.createSnapshots ?? true;
  let previousByPlayer = new Map<string, Record<string, unknown>>();
  let recentlySnapshotted = new Set<string>();
  if (createSnapshots) {
    const { data: previous, error: previousError } = await supabase
      .from("player_ratings")
      .select("player_id,leaderboard_id,rating,global_rank,wins,losses,games,last_synced_at")
      .in("player_id", playerIds);
    if (previousError) throw previousError;
    previousByPlayer = new Map(previous.map((rating) => [`${rating.player_id}:${rating.leaderboard_id}`, rating]));
    const snapshotCutoff = new Date(now.getTime() - SNAPSHOT_INTERVAL_MS).toISOString();
    const { data: recentSnapshots, error: snapshotsReadError } = await supabase
      .from("rating_snapshots")
      .select("player_id,leaderboard_id")
      .gte("recorded_at", snapshotCutoff)
      .in("player_id", playerIds);
    if (snapshotsReadError) throw snapshotsReadError;
    recentlySnapshotted = new Set(recentSnapshots.map((snapshot) => `${snapshot.player_id}:${snapshot.leaderboard_id}`));
  }

  const ratings = uniqueRatings.flatMap((row) => {
    const playerId = playerIdByProfile.get(row.profileId);
    return playerId ? [{
      player_id: playerId,
      leaderboard_id: row.leaderboardId,
      rating: row.rating,
      global_rank: row.globalRank,
      peak_rating: row.peakRating,
      wins: row.wins,
      losses: row.losses,
      games: row.games,
      last_match_at: row.lastMatchAt,
      last_synced_at: now.toISOString(),
    }] : [];
  });
  const { error: ratingError } = await supabase.from("player_ratings").upsert(ratings, {
    onConflict: "player_id,leaderboard_id",
  });
  if (ratingError) throw ratingError;

  const { error: syncStatusError } = await supabase.from("player_ladder_sync").upsert(
    ratings.map((rating) => ({
      player_id: rating.player_id,
      leaderboard_id: rating.leaderboard_id,
      checked_at: now.toISOString(),
      has_data: true,
    })),
    { onConflict: "player_id,leaderboard_id" },
  );
  if (syncStatusError) throw syncStatusError;

  const snapshots = createSnapshots ? ratings.filter((rating) => {
    const key = `${rating.player_id}:${rating.leaderboard_id}`;
    const old = previousByPlayer.get(key);
    if (!old) return true;
    const changed = ["rating", "global_rank", "wins", "losses", "games"]
      .some((field) => old[field] !== rating[field]);
    return changed || !recentlySnapshotted.has(key);
  }).map((rating) => ({
    player_id: rating.player_id,
    leaderboard_id: rating.leaderboard_id,
    rating: rating.rating,
    global_rank: rating.global_rank,
    wins: rating.wins,
    losses: rating.losses,
    games: rating.games,
    source: "WORLDS_EDGE",
    recorded_at: now.toISOString(),
  })) : [];
  if (snapshots.length) {
    const { error: snapshotError } = await supabase.from("rating_snapshots").insert(snapshots);
    if (snapshotError) throw snapshotError;
  }
  return { players: ratings.length, snapshots: snapshots.length };
}

async function markPersonalChecks(
  supabase: SupabaseClient,
  profileIds: string[],
  rows: NormalizedRating[],
  now: Date,
) {
  const { data: players, error } = await supabase
    .from("aoe_players")
    .select("id,profile_id")
    .in("profile_id", profileIds);
  if (error) throw error;
  const observed = new Set(rows.map((row) => `${row.profileId}:${row.leaderboardId}`));
  const checks = players.flatMap((player) => LADDERS.map((ladder) => ({
    player_id: player.id,
    leaderboard_id: ladder.id,
    checked_at: now.toISOString(),
    has_data: observed.has(`${player.profile_id}:${ladder.id}`),
  })));
  if (!checks.length) return;
  const { error: statusError } = await supabase.from("player_ladder_sync").upsert(checks, {
    onConflict: "player_id,leaderboard_id",
  });
  if (statusError) throw statusError;
}

async function backfillDirectory(
  supabase: SupabaseClient,
  now: Date,
  ladder: typeof LADDERS[number],
) {
  const { data: state, error: stateError } = await supabase
    .from("aoe_sync_state")
    .select("next_start,completed_at")
    .eq("key", ladder.stateKey)
    .maybeSingle();
  if (stateError) throw stateError;
  if (state?.completed_at) {
    return { completed: true, nextStart: state.next_start as number, players: 0, pages: 0 };
  }

  let nextStart = (state?.next_start as number | undefined) ?? 1;
  let players = 0;
  let pages = 0;
  let completed = false;

  for (let page = 0; page < BACKFILL_PAGES_PER_RUN; page += 1) {
    const rows = await fetchLeaderboardPage(ladder.id, nextStart);
    if (!rows.length) {
      completed = true;
    } else {
      const result = await persistRatings(supabase, rows, now, { createSnapshots: false });
      players += result.players;
      pages += 1;
      nextStart += rows.length;
      completed = rows.length < LEADERBOARD_SIZE;
    }

    const { error: progressError } = await supabase.from("aoe_sync_state").upsert({
      key: ladder.stateKey,
      next_start: nextStart,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
    if (progressError) throw progressError;
    if (completed) break;
  }

  return { completed, nextStart, players, pages };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const expectedSecret = Deno.env.get("AOE_SYNC_SECRET");
  if (!expectedSecret || request.headers.get("x-sync-secret") !== expectedSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase environment is incomplete" }, 500);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const now = new Date();
    const { data: duePlayers, error: dueError } = await supabase
      .from("aoe_players")
      .select("profile_id")
      .not("user_id", "is", null)
      .or(`next_sync_at.is.null,next_sync_at.lte.${now.toISOString()}`)
      .limit(LINKED_PLAYERS_PER_RUN);
    if (dueError) throw dueError;
    const dueProfileIds = duePlayers.map((player) => player.profile_id as string);

    const leaderboard: Record<string, { players: number; snapshots: number }> = {};
    for (const ladder of LADDERS) {
      const rows = await fetchLeaderboardPage(ladder.id);
      leaderboard[ladder.key] = await persistRatings(supabase, rows, now);
    }

    let personalPlayers = 0;
    let personalSnapshots = 0;
    for (const batch of chunks(dueProfileIds, PERSONAL_BATCH_SIZE)) {
      const rows = await fetchProfiles(batch);
      const result = await persistRatings(supabase, rows, now);
      await markPersonalChecks(supabase, batch, rows, now);
      personalPlayers += result.players;
      personalSnapshots += result.snapshots;
    }

    const directory: Record<string, Awaited<ReturnType<typeof backfillDirectory>>> = {};
    for (const ladder of LADDERS) {
      directory[ladder.key] = await backfillDirectory(supabase, now, ladder);
    }

    return json({
      ok: true,
      leaderboard,
      personal: { players: personalPlayers, snapshots: personalSnapshots },
      directory,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unexpected sync error" }, 502);
  }
});
