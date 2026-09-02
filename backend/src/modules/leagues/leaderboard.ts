export type LeaderboardSeed = {
  playerId: string;
  profileId: string;
  nickname: string;
  country: string | null;
  rating: number | null;
  globalRank: number | null;
  peakRating: number | null;
  joinedAt: Date;
  snapshots: { rating: number | null; recordedAt: Date }[];
};

const nearestRating = (snapshots: LeaderboardSeed['snapshots'], days: number) => {
  const target = Date.now() - days * 86_400_000;
  const eligible = snapshots.filter((item) => item.recordedAt.getTime() <= target);
  return eligible.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0]?.rating ?? null;
};

export function buildLeaderboard(players: LeaderboardSeed[]) {
  return [...players]
    .sort((a, b) =>
      (b.rating ?? -1) - (a.rating ?? -1) ||
      (a.globalRank ?? Number.MAX_SAFE_INTEGER) - (b.globalRank ?? Number.MAX_SAFE_INTEGER) ||
      (b.peakRating ?? -1) - (a.peakRating ?? -1) ||
      a.joinedAt.getTime() - b.joinedAt.getTime(),
    )
    .map((player, index) => {
      const delta = (days: number) => {
        const old = nearestRating(player.snapshots, days);
        return old === null || player.rating === null ? null : player.rating - old;
      };
      return {
        position: index + 1,
        playerId: player.playerId,
        profileId: player.profileId,
        nickname: player.nickname,
        country: player.country,
        rating: player.rating,
        globalRank: player.globalRank,
        peakRating: player.peakRating,
        delta24h: delta(1),
        delta7d: delta(7),
        delta30d: delta(30),
      };
    });
}
