import type { LeaderboardPlayer, LeagueSummary, PlayerProfile } from '@/types';

export const demoLeaderboard: LeaderboardPlayer[] = [
  { position: 1, profileId: '199325', nickname: 'Daut', platformName: 'Daut', country: 'RS', rating: 1852, peakRating: 1914, globalRank: 817, delta7d: 42, delta30d: 73 },
  { position: 2, profileId: '748243', nickname: 'Capoch', platformName: 'CapochAOE', country: 'AR', rating: 1798, peakRating: 1841, globalRank: 1042, delta7d: 18, delta30d: 51 },
  { position: 3, profileId: '492661', nickname: 'Nicov', platformName: 'Nicov', country: 'AR', rating: 1764, peakRating: 1828, globalRank: 1194, delta7d: -12, delta30d: 24 },
  { position: 4, profileId: '305182', nickname: 'Bruh', platformName: 'bruh_aoe', country: 'BR', rating: 1712, peakRating: 1784, globalRank: 1487, delta7d: 31, delta30d: 66 },
  { position: 5, profileId: '403822', nickname: 'Liereyy', platformName: 'Liereyy', country: 'AT', rating: 1689, peakRating: 1810, globalRank: 1631, delta7d: 0, delta30d: -18 },
  { position: 6, profileId: '903124', nickname: 'Fire', platformName: 'Fire_AoE', country: 'BR', rating: 1651, peakRating: 1698, globalRank: 1884, delta7d: -24, delta30d: 12 },
  { position: 7, profileId: '802143', nickname: 'Dogao', platformName: 'dogao', country: 'BR', rating: 1628, peakRating: 1732, globalRank: 2076, delta7d: 15, delta30d: -31 },
  { position: 8, profileId: '726843', nickname: 'Miguel', platformName: 'MiguelAOE', country: 'BR', rating: 1594, peakRating: 1642, globalRank: 2321, delta7d: -8, delta30d: 29 },
];

export const demoLeagues: LeagueSummary[] = [
  { id: '1', slug: 'vale-do-paraiba', name: 'Liga Vale do Paraíba', description: 'A comunidade competitiva do Vale.', memberCount: 32, position: 4, rating: 1712 },
  { id: '2', slug: 'aoe-da-firma', name: 'AoE da Firma', description: 'Partidas depois do expediente.', memberCount: 12, position: 1, rating: 1712 },
  { id: '3', slug: 'brasas-do-imperio', name: 'Brasas do Império', description: 'Comunidade brasileira aberta.', memberCount: 48, position: 7, rating: 1712 },
];

export const demoPlayer: PlayerProfile = {
  profileId: '305182', nickname: 'Bruh', country: 'BR', currentRating: 1712,
  peakRating: 1784, globalRank: 1487, delta30d: 66, wins: 982, losses: 741,
  history: [
    { label: '01 Aug', rating: 1628 }, { label: '05 Aug', rating: 1644 }, { label: '09 Aug', rating: 1631 },
    { label: '13 Aug', rating: 1670 }, { label: '17 Aug', rating: 1661 }, { label: '21 Aug', rating: 1698 },
    { label: '25 Aug', rating: 1688 }, { label: '29 Aug', rating: 1724 }, { label: '02 Sep', rating: 1712 },
  ],
};
