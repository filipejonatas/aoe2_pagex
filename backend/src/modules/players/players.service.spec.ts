import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayersService } from './players.service';

describe('PlayersService global leaderboard', () => {
  const playerRating = { findMany: jest.fn() };
  const aoEPlayer = { findMany: jest.fn() };
  const prisma = { playerRating, aoEPlayer };
  const config = { get: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    aoEPlayer.findMany.mockResolvedValue([{ country: 'br' }, { country: 'us' }]);
  });

  it('returns a country top three and an opaque cursor for the next page', async () => {
    const rows = Array.from({ length: 11 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      rating: 2000 - index,
      globalRank: index + 1,
      peakRating: 2050,
      wins: 20,
      losses: 10,
      games: 30,
      lastSyncedAt: new Date('2026-09-07T12:00:00Z'),
      player: { profileId: String(1000 + index), nickname: `Player ${index}`, country: 'BR', steamId: null },
    }));
    playerRating.findMany.mockResolvedValueOnce(rows).mockResolvedValueOnce(rows.slice(0, 3));
    const service = new PlayersService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    );

    const result = await service.globalLeaderboard({ leaderboardId: 3, country: 'BR', limit: 10 });

    expect(result.players).toHaveLength(10);
    expect(result.top).toHaveLength(3);
    expect(result.hasNext).toBe(true);
    expect(result.nextCursor).toEqual(expect.any(String));
    expect(result.players[0]).toMatchObject({ position: 1, rating: 2000, wins: 20, losses: 10 });
    expect(playerRating.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({ leaderboardId: 3, player: { country: 'br' } }),
      take: 11,
    }));
  });

  it('continues positions from a valid cursor', async () => {
    const service = new PlayersService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    );
    const cursor = Buffer.from(JSON.stringify({
      rating: 1500,
      id: '00000000-0000-4000-8000-000000000001',
      offset: 50,
    })).toString('base64url');
    const row = {
      id: '00000000-0000-4000-8000-000000000002',
      rating: 1499,
      globalRank: 52,
      peakRating: 1600,
      wins: null,
      losses: null,
      games: null,
      lastSyncedAt: new Date('2026-09-07T12:00:00Z'),
      player: { profileId: '1002', nickname: 'Next player', country: 'US', steamId: null },
    };
    playerRating.findMany.mockResolvedValueOnce([row]).mockResolvedValueOnce([row]);

    const result = await service.globalLeaderboard({ leaderboardId: 4, cursor, limit: 50 });

    expect(result.startPosition).toBe(51);
    expect(result.players[0].position).toBe(51);
    expect(result.hasNext).toBe(false);
  });
});
