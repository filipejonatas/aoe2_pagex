import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlayersService {
  private readonly logger = new Logger(PlayersService.name);
  private readonly profileRefreshes = new Map<string, Promise<unknown>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async search(query: string) {
    const normalized = query.trim();
    let players = await this.findCached(normalized);
    if (!players.length) {
      try {
        await this.refreshOnce(`lookup:${normalized.toLocaleLowerCase()}`, () => this.resolveAndCache(normalized));
        players = await this.findCached(normalized);
      } catch (error) {
        this.logger.warn(`AoE profile lookup failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }
    return players.map((player) => this.toPublicPlayer(player));
  }

  private findCached(query: string) {
    return this.prisma.aoEPlayer.findMany({
      where: {
        OR: [
          { nickname: { contains: query, mode: 'insensitive' } },
          { profileId: query },
          { steamId: query },
        ],
      },
      include: { ratings: { where: { leaderboardId: { in: [3, 4] } } } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });
  }

  async resolveSteamProfile(steamId: string) {
    if (!/^\d{17}$/.test(steamId)) return null;
    const cached = await this.prisma.aoEPlayer.findUnique({
      where: { steamId },
      include: { ladderSyncs: { where: { leaderboardId: 4 }, take: 1 } },
    });
    if (cached && this.isFresh(cached.ladderSyncs[0]?.checkedAt)) return cached;
    return this.refreshOnce(`steam:${steamId}`, () => this.resolveAndCache(steamId));
  }

  private async resolveAndCache(identifier: string) {
    const lookup = /^\d{17}$/.test(identifier)
      ? { key: 'profile_names', value: `/steam/${identifier}` }
      : /^\d+$/.test(identifier)
        ? { key: 'profile_ids', value: identifier }
        : { key: 'aliases', value: identifier };
    const query = new URLSearchParams({ title: 'age2', [lookup.key]: JSON.stringify([lookup.value]) });
    const baseUrl = this.config.get<string>('AOE_API_BASE_URL', 'https://aoe-api.worldsedgelink.com/community').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/leaderboard/getPersonalStat?${query}`, {
      headers: {
        accept: 'application/json',
        'user-agent': this.config.get<string>('AOE_API_USER_AGENT', 'AoE2PageX/1.0 (player identity resolver)'),
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`World's Edge returned HTTP ${response.status}`);

    const payload = await response.json() as {
      statGroups?: Array<{ id?: unknown; name?: unknown; members?: Array<Record<string, unknown>> }>;
      leaderboardStats?: Array<Record<string, unknown>>;
    };
    const groups = Array.isArray(payload.statGroups) ? payload.statGroups : [];
    const requestedSteamName = lookup.key === 'profile_names' ? lookup.value : null;
    const group = groups.find((candidate) => (candidate.members ?? []).some((member) => {
      if (requestedSteamName) return member.name === requestedSteamName;
      if (lookup.key === 'profile_ids') return String(member.profile_id) === lookup.value;
      return member.alias === lookup.value;
    }));
    const member = group?.members?.find((candidate) => {
      if (requestedSteamName) return candidate.name === requestedSteamName;
      if (lookup.key === 'profile_ids') return String(candidate.profile_id) === lookup.value;
      return candidate.alias === lookup.value;
    });
    const profileId = this.integer(member?.profile_id);
    const nickname = this.text(member?.alias) ?? this.text(group?.name);
    if (profileId === null || !nickname) return null;

    const platformName = this.text(member?.name);
    const steamId = platformName?.match(/^\/steam\/(\d{17})$/)?.[1] ?? null;
    const now = new Date();
    const player = await this.prisma.aoEPlayer.upsert({
      where: { profileId: String(profileId) },
      create: {
        profileId: String(profileId), steamId, nickname,
        country: this.text(member?.country_code) ?? this.text(member?.country),
        lastSyncAttemptAt: now, nextSyncAt: new Date(now.getTime() + 60 * 60 * 1_000), syncFailures: 0,
      },
      update: {
        ...(steamId ? { steamId } : {}), nickname,
        country: this.text(member?.country_code) ?? this.text(member?.country),
        lastSyncAttemptAt: now, nextSyncAt: new Date(now.getTime() + 60 * 60 * 1_000), syncFailures: 0,
      },
    });

    const ratings = (Array.isArray(payload.leaderboardStats) ? payload.leaderboardStats : [])
      .filter((rating) => String(rating.statgroup_id) === String(group?.id))
      .flatMap((rating) => {
        const leaderboardId = this.integer(rating.leaderboard_id);
        if (leaderboardId === null) return [];
        const wins = this.integer(rating.wins);
        const losses = this.integer(rating.losses);
        const rank = this.integer(rating.rank);
        return [{
          playerId: player.id,
          leaderboardId,
          rating: this.integer(rating.rating),
          globalRank: rank !== null && rank > 0 ? rank : null,
          peakRating: this.integer(rating.highestrating),
          wins,
          losses,
          games: wins === null || losses === null ? null : wins + losses,
          lastMatchAt: this.date(rating.lastmatchdate),
          lastSyncedAt: now,
        }];
      });
    const trackedLeaderboards = [3, 4];
    await this.prisma.$transaction([
      ...ratings.map((rating) => this.prisma.playerRating.upsert({
        where: { playerId_leaderboardId: { playerId: rating.playerId, leaderboardId: rating.leaderboardId } },
        create: rating,
        update: rating,
      })),
      ...trackedLeaderboards.map((leaderboardId) => this.prisma.playerLadderSync.upsert({
        where: { playerId_leaderboardId: { playerId: player.id, leaderboardId } },
        create: {
          playerId: player.id,
          leaderboardId,
          checkedAt: now,
          hasData: ratings.some((rating) => rating.leaderboardId === leaderboardId),
        },
        update: {
          checkedAt: now,
          hasData: ratings.some((rating) => rating.leaderboardId === leaderboardId),
        },
      })),
    ]);
    return player;
  }

  async link(userId: string, profileId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const [user, existingForUser, player] = await Promise.all([
          tx.user.findUniqueOrThrow({ where: { id: userId } }),
          tx.aoEPlayer.findUnique({ where: { userId } }),
          tx.aoEPlayer.findUnique({ where: { profileId } }),
        ]);
        if (existingForUser) throw new ConflictException('Your account already has an AoE profile');
        if (!player) throw new NotFoundException('Player is not cached yet');
        if (!user.steamId || !user.steamVerifiedAt) {
          throw new ForbiddenException('Verify your Steam identity before linking an AoE profile');
        }
        if (!player.steamId || player.steamId !== user.steamId) {
          throw new ForbiddenException('The selected AoE profile does not belong to your verified Steam account');
        }
        if (player.userId) throw new ConflictException('This AoE profile is already linked');

        const linked = await tx.aoEPlayer.update({
          where: { id: player.id },
          data: { userId, nextSyncAt: new Date() },
          include: { ratings: { where: { leaderboardId: { in: [3, 4] } } } },
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
    let player = await this.findPublicCached(profileId);
    if (!player) throw new NotFoundException('Player not found');

    const teamCheck = player.ladderSyncs[0];
    if (!this.isFresh(teamCheck?.checkedAt)) {
      try {
        await this.refreshOnce(`profile:${profileId}`, () => this.resolveAndCache(profileId));
        player = await this.findPublicCached(profileId) ?? player;
      } catch (error) {
        this.logger.warn(`AoE profile refresh failed for ${profileId}: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }
    return this.toPublicPlayer(player);
  }

  private findPublicCached(profileId: string) {
    return this.prisma.aoEPlayer.findUnique({
      where: { profileId },
      include: {
        ratings: { where: { leaderboardId: { in: [3, 4] } } },
        ladderSyncs: { where: { leaderboardId: 4 }, take: 1 },
        leagueMemberships: { include: { league: true } },
      },
    });
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

  toPublicPlayer<T extends {
    id: string;
    profileId: string;
    steamId: string | null;
    nickname: string;
    country: string | null;
    ratings: Array<{ leaderboardId: number; rating: number | null; globalRank: number | null; peakRating: number | null; wins: number | null; losses: number | null; games: number | null }>;
    ladderSyncs?: Array<{ leaderboardId: number; hasData: boolean }>;
    leagueMemberships?: unknown;
  }>(player: T) {
    const rating = player.ratings.find((item) => item.leaderboardId === 3);
    const teamRating = player.ratings.find((item) => item.leaderboardId === 4);
    return {
      id: player.id,
      profileId: player.profileId,
      steamId: player.steamId,
      nickname: player.nickname,
      country: player.country,
      currentRating: rating?.rating ?? null,
      currentGlobalRank: rating?.globalRank && rating.globalRank > 0 ? rating.globalRank : null,
      teamRating: teamRating?.rating ?? null,
      teamGlobalRank: teamRating?.globalRank && teamRating.globalRank > 0 ? teamRating.globalRank : null,
      teamWins: teamRating?.wins ?? null,
      teamLosses: teamRating?.losses ?? null,
      teamGames: teamRating?.games ?? null,
      teamDataStatus: teamRating
        ? 'available'
        : player.ladderSyncs?.some((item) => item.leaderboardId === 4)
          ? 'unavailable'
          : 'pending',
      peakRating: rating?.peakRating ?? null,
      wins: rating?.wins ?? null,
      losses: rating?.losses ?? null,
      games: rating?.games ?? null,
      ...(player.leagueMemberships ? { leagueMemberships: player.leagueMemberships } : {}),
    };
  }

  private integer(value: unknown) {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  private text(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private date(value: unknown) {
    const text = this.text(value);
    if (!text) return null;
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private isFresh(checkedAt?: Date | null) {
    if (!checkedAt) return false;
    const configuredMinutes = this.config.get<number>('AOE_PROFILE_CACHE_TTL_MINUTES', 1440);
    const minutes = Number.isFinite(Number(configuredMinutes))
      ? Math.min(10_080, Math.max(5, Number(configuredMinutes)))
      : 1440;
    return checkedAt.getTime() >= Date.now() - minutes * 60_000;
  }

  private refreshOnce<T>(key: string, action: () => Promise<T>): Promise<T> {
    const pending = this.profileRefreshes.get(key) as Promise<T> | undefined;
    if (pending) return pending;
    const refresh = action().finally(() => this.profileRefreshes.delete(key));
    this.profileRefreshes.set(key, refresh);
    return refresh;
  }
}
