import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string) {
    const normalized = query.trim();
    const players = await this.prisma.aoEPlayer.findMany({
      where: {
        OR: [
          { nickname: { contains: normalized, mode: 'insensitive' } },
          { profileId: normalized },
          { steamId: normalized },
        ],
      },
      include: { ratings: { where: { leaderboardId: 3 }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });
    return players.map((player) => this.toPublicPlayer(player));
  }

  async link(userId: string, profileId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const [existingForUser, player] = await Promise.all([
          tx.aoEPlayer.findUnique({ where: { userId } }),
          tx.aoEPlayer.findUnique({ where: { profileId } }),
        ]);
        if (existingForUser) throw new ConflictException('Your account already has an AoE profile');
        if (!player) throw new NotFoundException('Player is not cached yet');
        if (player.userId) throw new ConflictException('This AoE profile is already linked');

        const linked = await tx.aoEPlayer.update({
          where: { id: player.id },
          data: { userId, nextSyncAt: new Date() },
          include: { ratings: { where: { leaderboardId: 3 }, take: 1 } },
        });
        return this.toPublicPlayer(linked);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This AoE profile is already linked');
      }
      throw error;
    }
  }

  async findPublic(profileId: string) {
    const player = await this.prisma.aoEPlayer.findUnique({
      where: { profileId },
      include: {
        ratings: { where: { leaderboardId: 3 }, take: 1 },
        leagueMemberships: { include: { league: true } },
      },
    });
    if (!player) throw new NotFoundException('Player not found');
    return this.toPublicPlayer(player);
  }

  ratingHistory(profileId: string, range: '7d' | '30d' | '90d' | 'all') {
    const days = range === 'all' ? null : Number.parseInt(range, 10);
    return this.prisma.ratingSnapshot.findMany({
      where: {
        player: { profileId },
        leaderboardId: 3,
        ...(days ? { recordedAt: { gte: new Date(Date.now() - days * 86_400_000) } } : {}),
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  private toPublicPlayer<T extends {
    id: string;
    profileId: string;
    steamId: string | null;
    nickname: string;
    country: string | null;
    ratings: Array<{ rating: number | null; globalRank: number | null; peakRating: number | null; wins: number | null; losses: number | null; games: number | null }>;
    leagueMemberships?: unknown;
  }>(player: T) {
    const rating = player.ratings[0];
    return {
      id: player.id,
      profileId: player.profileId,
      steamId: player.steamId,
      nickname: player.nickname,
      country: player.country,
      currentRating: rating?.rating ?? null,
      currentGlobalRank: rating?.globalRank ?? null,
      peakRating: rating?.peakRating ?? null,
      wins: rating?.wins ?? null,
      losses: rating?.losses ?? null,
      games: rating?.games ?? null,
      ...(player.leagueMemberships ? { leagueMemberships: player.leagueMemberships } : {}),
    };
  }
}
