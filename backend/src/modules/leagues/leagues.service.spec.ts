import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { PrismaService } from '../../prisma/prisma.service';

const now = new Date('2026-09-07T00:00:00.000Z');

function league(overrides: Record<string, unknown> = {}) {
  return {
    id: 'league-id',
    slug: 'private-league-a1b2',
    name: 'Private League',
    description: null,
    visibility: 'PRIVATE' as const,
    leaderboardId: 3,
    ownerId: 'owner-id',
    inviteCode: 'super-secret-invite',
    createdAt: now,
    updatedAt: now,
    owner: { username: 'owner' },
    _count: { members: 1 },
    members: [{ player: { userId: 'owner-id' } }],
    ...overrides,
  };
}

describe('LeaguesService security', () => {
  const prisma = {
    league: { findUnique: jest.fn(), findMany: jest.fn() },
    aoEPlayer: { findUnique: jest.fn() },
    leagueMember: { create: jest.fn(), delete: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
  };
  const service = new LeaguesService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('hides a private league from anonymous visitors', async () => {
    prisma.league.findUnique.mockResolvedValue(league());
    await expect(service.findBySlug('private-league-a1b2')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not expose invite codes in public league details', async () => {
    prisma.league.findUnique.mockResolvedValue(league({ visibility: 'PUBLIC' }));
    const result = await service.findBySlug('private-league-a1b2');
    expect(result).not.toHaveProperty('inviteCode');
    expect(result).not.toHaveProperty('members');
  });

  it('returns an invite code only for leagues owned by the current user', async () => {
    prisma.league.findMany.mockResolvedValue([
      league(),
      league({ id: 'member-league', slug: 'member-league', ownerId: 'another-user' }),
    ]);
    const result = await service.mine('owner-id');
    expect(result[0]).toMatchObject({ isOwner: true, inviteCode: 'super-secret-invite' });
    expect(result[1]).toMatchObject({ isOwner: false });
    expect(result[1]).not.toHaveProperty('inviteCode');
  });

  it('accepts an invite idempotently and returns the destination league', async () => {
    prisma.league.findUnique.mockResolvedValue({ id: 'league-id', slug: 'private-league-a1b2', name: 'Private League' });
    prisma.aoEPlayer.findUnique.mockResolvedValue({ id: 'player-id' });
    prisma.leagueMember.findUnique.mockResolvedValue({ id: 'membership-id' });
    prisma.leagueMember.upsert.mockResolvedValue({ id: 'membership-id' });

    await expect(service.joinByCode('user-id', 'super-secret-invite')).resolves.toEqual({
      league: { id: 'league-id', slug: 'private-league-a1b2', name: 'Private League' },
      joined: false,
    });
    expect(prisma.leagueMember.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { leagueId_playerId: { leagueId: 'league-id', playerId: 'player-id' } },
    }));
  });

  it('allows the owner to add a cached player idempotently', async () => {
    prisma.league.findUnique.mockResolvedValue({ id: 'league-id', ownerId: 'owner-id' });
    prisma.aoEPlayer.findUnique.mockResolvedValue({ id: 'player-id', profileId: '2585521', nickname: 'Tesla_G' });
    prisma.leagueMember.findUnique.mockResolvedValue(null);
    prisma.leagueMember.upsert.mockResolvedValue({ id: 'membership-id' });

    await expect(service.addPlayer('owner-id', 'league-id', '2585521')).resolves.toMatchObject({
      player: { profileId: '2585521' },
      added: true,
    });
    expect(prisma.leagueMember.upsert).toHaveBeenCalledWith({
      where: { leagueId_playerId: { leagueId: 'league-id', playerId: 'player-id' } },
      create: { leagueId: 'league-id', playerId: 'player-id' },
      update: {},
    });
  });

  it('blocks a non-owner from adding a player', async () => {
    prisma.league.findUnique.mockResolvedValue({ id: 'league-id', ownerId: 'owner-id' });
    prisma.aoEPlayer.findUnique.mockResolvedValue({ id: 'player-id', profileId: '2585521', nickname: 'Tesla_G' });

    await expect(service.addPlayer('member-id', 'league-id', '2585521')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.leagueMember.upsert).not.toHaveBeenCalled();
  });

  it('allows the owner to remove another player', async () => {
    prisma.league.findUnique.mockResolvedValue({ ownerId: 'owner-id' });
    prisma.aoEPlayer.findUnique.mockResolvedValue({ id: 'player-id', userId: 'member-id' });
    prisma.leagueMember.delete.mockResolvedValue({ id: 'membership-id' });

    await expect(service.removePlayer('owner-id', 'league-id', '2585521')).resolves.toEqual({ removed: true });
    expect(prisma.leagueMember.delete).toHaveBeenCalledWith({
      where: { leagueId_playerId: { leagueId: 'league-id', playerId: 'player-id' } },
    });
  });

  it('does not allow the league owner to remove their own player', async () => {
    prisma.league.findUnique.mockResolvedValue({ ownerId: 'owner-id' });
    prisma.aoEPlayer.findUnique.mockResolvedValue({ id: 'owner-player-id', userId: 'owner-id' });

    await expect(service.removePlayer('owner-id', 'league-id', '100')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.leagueMember.delete).not.toHaveBeenCalled();
  });
});
