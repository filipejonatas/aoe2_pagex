export type LeaderboardPlayer = {
  position: number;
  profileId: string;
  nickname: string;
  platformName?: string;
  country?: string | null;
  rating: number | null;
  peakRating: number | null;
  globalRank: number | null;
  delta7d: number | null;
  delta30d: number | null;
};

export type LeagueSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  position: number;
  rating: number;
};

export type PlayerProfile = {
  profileId: string;
  nickname: string;
  country: string;
  currentRating: number;
  peakRating: number;
  globalRank: number;
  delta30d: number;
  wins: number;
  losses: number;
  history: { label: string; rating: number }[];
};
