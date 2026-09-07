import type { LeaderboardPlayer } from '@/types';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';

export async function getLeaderboard(slug: string): Promise<{ league: { name: string; description?: string; updatedAt?: string }; leaderboard: LeaderboardPlayer[] } | null> {
  try {
    const response = await fetch(`${baseUrl}/leagues/${slug}/leaderboard`, { next: { revalidate: 60 } });
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
