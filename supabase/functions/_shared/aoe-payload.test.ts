import { assertEquals } from "jsr:@std/assert@1";
import { normalizeRatings } from "./aoe-payload.ts";

Deno.test("joins stat groups with leaderboard stats", () => {
  const result = normalizeRatings({
    statGroups: [{
      id: 7,
      name: "fallback",
      members: [{ profile_id: 42, name: "/steam/76561198000000000", alias: "Player", country: "BR" }],
    }],
    leaderboardStats: [{
      statgroup_id: 7,
      leaderboard_id: 3,
      rating: 1700,
      rank: 123,
      highestrating: 1750,
      wins: 20,
      losses: 10,
      lastmatchdate: "2026-09-01T12:00:00Z",
    }],
  });

  assertEquals(result, [{
    profileId: "42",
    steamId: "76561198000000000",
    nickname: "Player",
    country: "BR",
    leaderboardId: 3,
    rating: 1700,
    globalRank: 123,
    peakRating: 1750,
    wins: 20,
    losses: 10,
    games: 30,
    lastMatchAt: "2026-09-01T12:00:00Z",
  }]);
});
