import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeagueDto } from './dto/leagues.dto';
import { buildLeaderboard } from './leaderboard';

@Injectable()
export class LeaguesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateLeagueDto) {
    const player = await this.prisma.aoEPlayer.findUnique({ where: { userId: ownerId } });
    if (!player) throw new ConflictException('Link an AoE profile before creating a league');
    const slugBase = dto.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const suffix = randomBytes(2).toString('hex');
    return this.prisma.league.create({
      data: {
        ...dto,
        ownerId,
        slug: `${slugBase}-${suffix}`,
        inviteCode: randomBytes(16).toString('base64url'),
        members: { create: { playerId: player.id } },
      },
    });
  }

  async mine(userId: string) {
    const leagues = await this.prisma.league.findMany({
      where: { members: { some: { player: { userId } } } },
      include: { _count: { select: { members: true } }, members: { where: { player: { userId } }, include: { player: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return leagues.map((league) => ({
      id: league.id,
      slug: league.slug,
      name: league.name,
      description: league.description,
      visibility: league.visibility,
      leaderboardId: league.leaderboardId,
      createdAt: league.createdAt,
      updatedAt: league.updatedAt,
      _count: league._count,
      isOwner: league.ownerId === userId,
      ...(league.ownerId === userId ? { inviteCode: league.inviteCode } : {}),
    }));
  }

  async findBySlug(slug: string, viewerId?: string) {
    const league = await this.prisma.league.findUnique({
      where: { slug },
      include: {
        owner: { select: { username: true } },
        _count: { select: { members: true } },
        members: { select: { player: { select: { userId: true } } } },
      },
    });
    if (!league) throw new NotFoundException('League not found');
    this.ensureCanView(league, viewerId);
    return {
      id: league.id,
      slug: league.slug,
      name: league.name,
      description: league.description,
      visibility: league.visibility,
      leaderboardId: league.leaderboardId,
      owner: league.owner,
      memberCount: league._count.members,
      createdAt: league.createdAt,
      updatedAt: league.updatedAt,
    };
  }

  async joinByCode(userId: string, inviteCode: string) {
    const league = await this.prisma.league.findUnique({
      where: { inviteCode: inviteCode.trim() },
      select: { id: true },
    });
    if (!league) throw new NotFoundException('Invalid invite');
    return this.addMember(userId, league.id);
  }

  async join(userId: string, leagueId: string, inviteCode: string) {
    const [league, player] = await Promise.all([
      this.prisma.league.findUnique({ where: { id: leagueId } }),
      this.prisma.aoEPlayer.findUnique({ where: { userId } }),
    ]);
    if (!league || league.inviteCode !== inviteCode.toUpperCase()) throw new NotFoundException('Invalid invite');
    if (!player) throw new ConflictException('Link an AoE profile before joining a league');
    return this.addMember(userId, league.id, player.id);
  }

  async leave(userId: string, leagueId: string) {
    const league = await this.prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) throw new NotFoundException('League not found');
    if (league.ownerId === userId) throw new ForbiddenException('League owner cannot leave the league');
    return this.prisma.leagueMember.delete({ where: { leagueId_playerId: {
      leagueId,
      playerId: (await this.prisma.aoEPlayer.findUniqueOrThrow({ where: { userId } })).id,
    } } });
  }

  async leaderboard(slug: string, leaderboardId?: number, viewerId?: string) {
    const league = await this.prisma.league.findUnique({
      where: { slug },
      include: {
        members: {
          include: {
            player: {
              include: {
                ratings: true,
                ratingSnapshots: { orderBy: { recordedAt: 'desc' }, take: 100 },
              },
            },
          },
        },
      },
    });
    if (!league) throw new NotFoundException('League not found');
    this.ensureCanView(league, viewerId);
    const selectedLeaderboardId = leaderboardId ?? league.leaderboardId;
    const leaderboard = buildLeaderboard(league.members.map((member) => {
      const rating = member.player.ratings.find((item) => item.leaderboardId === selectedLeaderboardId);
      return {
        playerId: member.player.id,
        profileId: member.player.profileId,
        nickname: member.player.nickname,
        country: member.player.country,
        rating: rating?.rating ?? null,
        globalRank: rating?.globalRank && rating.globalRank > 0 ? rating.globalRank : null,
        peakRating: rating?.peakRating ?? null,
        joinedAt: member.joinedAt,
        snapshots: member.player.ratingSnapshots.filter((item) => item.leaderboardId === selectedLeaderboardId),
      };
    }));
    return {
      league: {
        id: league.id,
        name: league.name,
        slug: league.slug,
        description: league.description,
        visibility: league.visibility,
        defaultLeaderboardId: league.leaderboardId,
        leaderboardId: selectedLeaderboardId,
        updatedAt: league.updatedAt,
        isOwner: league.ownerId === viewerId,
        ...(league.ownerId === viewerId ? { inviteCode: league.inviteCode } : {}),
      },
      leaderboard,
    };
  }

  private async addMember(userId: string, leagueId: string, knownPlayerId?: string) {
    const playerId = knownPlayerId ?? (await this.prisma.aoEPlayer.findUnique({
      where: { userId },
      select: { id: true },
    }))?.id;
    if (!playerId) throw new ConflictException('Link an AoE profile before joining a league');
    return this.prisma.leagueMember.create({ data: { leagueId, playerId } }).catch(() => {
      throw new ConflictException('Player is already a member');
    });
  }

  private ensureCanView(
    league: { visibility: 'PUBLIC' | 'PRIVATE'; ownerId: string; members: Array<{ player: { userId: string | null } }> },
    viewerId?: string,
  ) {
    if (league.visibility === 'PUBLIC') return;
    const isMember = viewerId && (
      league.ownerId === viewerId || league.members.some((member) => member.player.userId === viewerId)
    );
    if (!isMember) throw new NotFoundException('League not found');
  }
}
