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
  nickname: string;
  country: string | null;
  currentRating: number | null;
  peakRating: number | null;
  currentGlobalRank: number | null;
  wins: number | null;
  losses: number | null;
  leagueMemberships: { league: { id: string; slug: string; name: string }; joinedAt: string }[];
};

export async function getPlayer(profileId: string): Promise<PublicPlayer | null> {
  try {
    const response = await fetch(`${baseUrl}/players/${profileId}`, { next: { revalidate: 60 } });
    return response.ok ? response.json() : null;
  } catch { return null; }
}

export async function getRatingHistory(profileId: string) {
  try {
    const response = await fetch(`${baseUrl}/players/${profileId}/rating-history?range=30d`, { next: { revalidate: 60 } });
    if (!response.ok) return [];
    return await response.json() as { rating: number | null; recordedAt: string }[];
  } catch { return []; }
}
