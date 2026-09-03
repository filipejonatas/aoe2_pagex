const LEADERBOARD_ID = 3;

type JsonObject = Record<string, unknown>;

export type NormalizedRating = {
  profileId: string;
  steamId: string | null;
  nickname: string;
  country: string | null;
  leaderboardId: number;
  rating: number | null;
  globalRank: number | null;
  peakRating: number | null;
  wins: number | null;
  losses: number | null;
  games: number | null;
  lastMatchAt: string | null;
};

const objects = (value: unknown): JsonObject[] =>
  Array.isArray(value)
    ? value.filter((item): item is JsonObject => item !== null && typeof item === "object")
    : [];

const integer = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export function normalizeRatings(payload: unknown): NormalizedRating[] {
  if (!payload || typeof payload !== "object") return [];
  const source = payload as JsonObject;
  const groups = objects(source.statGroups);
  const statsByGroup = new Map(
    objects(source.leaderboardStats)
      .filter((stat) => integer(stat.leaderboard_id) === LEADERBOARD_ID)
      .map((stat) => [String(stat.statgroup_id), stat]),
  );

  return groups.flatMap((group) => {
    const stat = statsByGroup.get(String(group.id));
    if (!stat) return [];
    return objects(group.members).flatMap((member) => {
      const profileId = integer(member.profile_id);
      if (profileId === null) return [];
      const platformName = text(member.name);
      const nickname = text(member.alias) ?? text(group.name) ?? platformName;
      if (!nickname) return [];
      const wins = integer(stat.wins);
      const losses = integer(stat.losses);
      return [{
        profileId: String(profileId),
        steamId: platformName?.match(/^\/steam\/(\d+)$/)?.[1] ?? null,
        nickname,
        country: text(member.country_code) ?? text(member.country),
        leaderboardId: LEADERBOARD_ID,
        rating: integer(stat.rating),
        globalRank: integer(stat.rank),
        peakRating: integer(stat.highestrating),
        wins,
        losses,
        games: wins === null || losses === null ? null : wins + losses,
        lastMatchAt: text(stat.lastmatchdate),
      }];
    });
  });
}
