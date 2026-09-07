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
  const statsByGroup = new Map<string, JsonObject[]>();
  for (const stat of objects(source.leaderboardStats)) {
    const key = String(stat.statgroup_id);
    statsByGroup.set(key, [...(statsByGroup.get(key) ?? []), stat]);
  }

  return groups.flatMap((group) => {
    const stats = statsByGroup.get(String(group.id)) ?? [];
    return objects(group.members).flatMap((member) => {
      const profileId = integer(member.profile_id);
      if (profileId === null) return [];
      const platformName = text(member.name);
      const nickname = text(member.alias) ?? text(group.name) ?? platformName;
      if (!nickname) return [];
      return stats.flatMap((stat) => {
        const leaderboardId = integer(stat.leaderboard_id);
        if (leaderboardId === null) return [];
        const wins = integer(stat.wins);
        const losses = integer(stat.losses);
        const rank = integer(stat.rank);
        return [{
          profileId: String(profileId),
          steamId: platformName?.match(/^\/steam\/(\d+)$/)?.[1] ?? null,
          nickname,
          country: text(member.country_code) ?? text(member.country),
          leaderboardId,
          rating: integer(stat.rating),
          globalRank: rank !== null && rank > 0 ? rank : null,
          peakRating: integer(stat.highestrating),
          wins,
          losses,
          games: wins === null || losses === null ? null : wins + losses,
          lastMatchAt: text(stat.lastmatchdate),
        }];
      });
    });
  });
}
