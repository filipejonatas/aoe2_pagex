import { NotFoundException } from '@nestjs/common';
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
    leagueMember: { create: jest.fn() },
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
});
