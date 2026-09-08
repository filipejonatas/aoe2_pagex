import type { LeaderboardPlayer } from '@/types';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';

export type LeagueLeaderboardResponse = {
  league: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    visibility: 'PUBLIC' | 'PRIVATE';
    defaultLeaderboardId: 3 | 4;
    leaderboardId: 3 | 4;
    updatedAt?: string;
    isOwner: boolean;
    inviteCode?: string;
  };
  leaderboard: LeaderboardPlayer[];
};

export async function getLeaderboard(slug: string, leaderboardId?: 3 | 4, token?: string | null): Promise<LeagueLeaderboardResponse | null> {
  try {
    const query = leaderboardId ? `?leaderboardId=${leaderboardId}` : '';
    const response = await fetch(`${baseUrl}/leagues/${slug}/leaderboard${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export type PublicPlayer = {
  profileId: string;
  steamId: string | null;
  nickname: string;
  country: string | null;
  currentRating: number | null;
  peakRating: number | null;
  currentGlobalRank: number | null;
  teamRating: number | null;
  teamGlobalRank: number | null;
  teamWins: number | null;
  teamLosses: number | null;
  teamGames: number | null;
  teamDataStatus: 'available' | 'unavailable' | 'pending';
  wins: number | null;
  losses: number | null;
  leagueMemberships: { league: { id: string; slug: string; name: string }; joinedAt: string }[];
};

export async function getPlayer(profileId: string): Promise<PublicPlayer | null> {
  try {
    const response = await fetch(`${baseUrl}/players/${profileId}`, { cache: 'no-store' });
    return response.ok ? response.json() : null;
  } catch { return null; }
}

export async function getRatingHistory(profileId: string) {
  try {
    const response = await fetch(`${baseUrl}/players/${profileId}/rating-history?range=all`, { cache: 'no-store' });
    if (!response.ok) return [];
    return await response.json() as { rating: number | null; recordedAt: string }[];
  } catch { return []; }
}
