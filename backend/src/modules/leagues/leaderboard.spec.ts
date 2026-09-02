import { buildLeaderboard } from './leaderboard';

describe('buildLeaderboard', () => {
  it('orders rating first and calculates snapshot deltas', () => {
    const now = Date.now();
    const rows = buildLeaderboard([
      { playerId: 'a', profileId: '1', nickname: 'A', country: null, rating: 1500, globalRank: 10, peakRating: 1510, joinedAt: new Date(), snapshots: [{ rating: 1450, recordedAt: new Date(now - 8 * 86_400_000) }] },
      { playerId: 'b', profileId: '2', nickname: 'B', country: null, rating: 1600, globalRank: 20, peakRating: 1600, joinedAt: new Date(), snapshots: [] },
    ]);
    expect(rows[0]).toMatchObject({ nickname: 'B', position: 1 });
    expect(rows[1]).toMatchObject({ nickname: 'A', delta7d: 50 });
  });
});
