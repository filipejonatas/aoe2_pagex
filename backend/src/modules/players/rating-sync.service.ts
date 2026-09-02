import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AOE_PROVIDER, AoEProvider } from '../../integrations/aoe/aoe-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RatingSyncService {
  private readonly logger = new Logger(RatingSyncService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(AOE_PROVIDER) private readonly aoe: AoEProvider,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncDuePlayers() {
    const interval = this.config.get<number>('AOE_SYNC_INTERVAL_MINUTES', 60);
    const cutoff = new Date(Date.now() - interval * 60_000);
    const players = await this.prisma.aoEPlayer.findMany({
      where: { OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: cutoff } }] },
      take: 25,
    });

    for (const player of players) {
      try {
        const remote = await this.aoe.getPlayer(player.profileId);
        const latest = await this.prisma.ratingSnapshot.findFirst({
          where: { playerId: player.id }, orderBy: { recordedAt: 'desc' },
        });
        const needsSnapshot = remote.rating !== player.currentRating || !latest || Date.now() - latest.recordedAt.getTime() >= 86_400_000;
        await this.prisma.$transaction([
          this.prisma.aoEPlayer.update({
            where: { id: player.id },
            data: {
              nickname: remote.nickname,
              currentRating: remote.rating,
              currentGlobalRank: remote.rank,
              peakRating: Math.max(player.peakRating ?? 0, remote.peakRating ?? remote.rating ?? 0),
              wins: remote.wins,
              losses: remote.losses,
              games: remote.games,
              lastSyncedAt: new Date(),
            },
          }),
          ...(needsSnapshot ? [this.prisma.ratingSnapshot.create({ data: {
            playerId: player.id, rating: remote.rating, globalRank: remote.rank,
            wins: remote.wins, losses: remote.losses, games: remote.games,
          } })] : []),
        ]);
      } catch {
        this.logger.warn(`Keeping cached data for profile ${player.profileId}: provider unavailable`);
      }
    }
  }
}
