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
        inviteCode: randomBytes(5).toString('hex').toUpperCase(),
        members: { create: { playerId: player.id } },
      },
    });
  }

  async mine(userId: string) {
    return this.prisma.league.findMany({
      where: { members: { some: { player: { userId } } } },
      include: { _count: { select: { members: true } }, members: { where: { player: { userId } }, include: { player: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findBySlug(slug: string) {
    const league = await this.prisma.league.findUnique({
      where: { slug }, include: { owner: { select: { username: true } }, _count: { select: { members: true } } },
    });
    if (!league) throw new NotFoundException('League not found');
    return league;
  }

  async join(userId: string, leagueId: string, inviteCode: string) {
    const [league, player] = await Promise.all([
      this.prisma.league.findUnique({ where: { id: leagueId } }),
      this.prisma.aoEPlayer.findUnique({ where: { userId } }),
    ]);
    if (!league || league.inviteCode !== inviteCode.toUpperCase()) throw new NotFoundException('Invalid invite');
    if (!player) throw new ConflictException('Link an AoE profile before joining a league');
    return this.prisma.leagueMember.create({ data: { leagueId, playerId: player.id } }).catch(() => {
      throw new ConflictException('Player is already a member');
    });
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

  async leaderboard(slug: string) {
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
    const leaderboard = buildLeaderboard(league.members.map((member) => {
      const rating = member.player.ratings.find((item) => item.leaderboardId === league.leaderboardId);
      return {
        playerId: member.player.id,
        profileId: member.player.profileId,
        nickname: member.player.nickname,
        country: member.player.country,
        rating: rating?.rating ?? null,
        globalRank: rating?.globalRank ?? null,
        peakRating: rating?.peakRating ?? null,
        joinedAt: member.joinedAt,
        snapshots: member.player.ratingSnapshots.filter((item) => item.leaderboardId === league.leaderboardId),
      };
    }));
    return { league: { id: league.id, name: league.name, slug: league.slug, description: league.description, updatedAt: league.updatedAt }, leaderboard };
  }
}
