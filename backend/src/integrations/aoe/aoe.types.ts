export type AoEPlayerResult = {
  profileId: string;
  nickname: string;
  steamId?: string;
  country?: string;
  rating: number | null;
  rank: number | null;
  peakRating?: number | null;
  wins?: number | null;
  losses?: number | null;
  games?: number | null;
};
