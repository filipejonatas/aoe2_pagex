import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AOE_PROVIDER, AoEProvider } from '../../integrations/aoe/aoe-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlayersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AOE_PROVIDER) private readonly aoe: AoEProvider,
  ) {}

  search(query: string) { return this.aoe.searchPlayers(query); }

  async link(userId: string, profileId: string) {
    const remote = await this.aoe.getPlayer(profileId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const player = await tx.aoEPlayer.create({
          data: {
            userId,
            profileId: remote.profileId,
            steamId: remote.steamId,
            nickname: remote.nickname,
            country: remote.country,
            currentRating: remote.rating,
            currentGlobalRank: remote.rank,
            peakRating: remote.peakRating ?? remote.rating,
            wins: remote.wins,
            losses: remote.losses,
            games: remote.games,
            lastSyncedAt: new Date(),
          },
        });
        await tx.ratingSnapshot.create({
          data: {
            playerId: player.id,
            rating: player.currentRating,
            globalRank: player.currentGlobalRank,
            wins: player.wins,
            losses: player.losses,
            games: player.games,
          },
        });
        return player;
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
      include: { leagueMemberships: { include: { league: true } } },
    });
    if (!player) throw new NotFoundException('Player not found');
    return player;
  }

  ratingHistory(profileId: string, range: '7d' | '30d' | '90d' | 'all') {
    const days = range === 'all' ? null : Number.parseInt(range, 10);
    return this.prisma.ratingSnapshot.findMany({
      where: {
        player: { profileId },
        ...(days ? { recordedAt: { gte: new Date(Date.now() - days * 86_400_000) } } : {}),
      },
      orderBy: { recordedAt: 'asc' },
    });
  }
}
