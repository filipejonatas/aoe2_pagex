import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GlobalLeaderboardQueryDto } from './dto/players.dto';

@Injectable()
export class PlayersService {
  private readonly logger = new Logger(PlayersService.name);
  private readonly profileRefreshes = new Map<string, Promise<unknown>>();
  private readonly countriesCache = new Map<number, { expiresAt: number; countries: string[] }>();

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

  async globalLeaderboard(query: GlobalLeaderboardQueryDto) {
    const cursor = this.decodeLeaderboardCursor(query.cursor);
    const country = query.country?.toLowerCase();
    const baseWhere: Prisma.PlayerRatingWhereInput = {
      leaderboardId: query.leaderboardId,
      rating: { not: null },
      player: {
        ...(country ? { country } : {}),
        ...(query.search ? { nickname: { contains: query.search, mode: 'insensitive' } } : {}),
      },
    };
    const pageWhere: Prisma.PlayerRatingWhereInput = cursor ? {
      AND: [
        baseWhere,
        {
          OR: [
            { rating: { lt: cursor.rating } },
            { rating: cursor.rating, id: { gt: cursor.id } },
          ],
        },
      ],
    } : baseWhere;
    const select = {
      id: true,
      rating: true,
      globalRank: true,
      peakRating: true,
      wins: true,
      losses: true,
      games: true,
      lastSyncedAt: true,
      player: { select: { profileId: true, nickname: true, country: true, steamId: true } },
    } satisfies Prisma.PlayerRatingSelect;
    const orderBy: Prisma.PlayerRatingOrderByWithRelationInput[] = [
      { rating: 'desc' },
      { id: 'asc' },
    ];

    const topWhere: Prisma.PlayerRatingWhereInput = {
      leaderboardId: query.leaderboardId,
      rating: { not: null },
      player: country ? { country } : {},
    };
    const [pageRows, topRows, countries] = await Promise.all([
      this.prisma.playerRating.findMany({ where: pageWhere, select, orderBy, take: query.limit + 1 }),
      this.prisma.playerRating.findMany({ where: topWhere, select, orderBy, take: 3 }),
      this.leaderboardCountries(query.leaderboardId),
    ]);
    const hasNext = pageRows.length > query.limit;
    const rows = pageRows.slice(0, query.limit);
    const startPosition = cursor?.offset ? cursor.offset + 1 : 1;
    const toRow = (row: typeof rows[number], position: number) => ({
      position,
      profileId: row.player.profileId,
      nickname: row.player.nickname,
      platformName: row.player.steamId ? 'Steam' : undefined,
      country: row.player.country?.toUpperCase() ?? null,
      rating: row.rating,
      peakRating: row.peakRating,
      globalRank: row.globalRank && row.globalRank > 0 ? row.globalRank : null,
      wins: row.wins,
      losses: row.losses,
      games: row.games,
      delta7d: null,
      delta30d: null,
    });
    const last = rows.at(-1);
    return {
      leaderboardId: query.leaderboardId,
      country: country?.toUpperCase() ?? null,
      search: query.search ?? null,
      countries,
      top: topRows.map((row, index) => toRow(row, index + 1)),
      players: rows.map((row, index) => toRow(row, startPosition + index)),
      startPosition,
      hasNext,
      nextCursor: hasNext && last && last.rating !== null
        ? this.encodeLeaderboardCursor({ rating: last.rating, id: last.id, offset: startPosition + rows.length - 1 })
        : null,
      updatedAt: rows.reduce<Date | null>((latest, row) => !latest || row.lastSyncedAt > latest ? row.lastSyncedAt : latest, null),
    };
  }

  private async leaderboardCountries(leaderboardId: number) {
    const cached = this.countriesCache.get(leaderboardId);
    if (cached && cached.expiresAt > Date.now()) return cached.countries;
    const rows = await this.prisma.aoEPlayer.findMany({
      where: { country: { not: null }, ratings: { some: { leaderboardId, rating: { not: null } } } },
      distinct: ['country'],
      select: { country: true },
      orderBy: { country: 'asc' },
    });
    const countries = rows.flatMap((row) => row.country ? [row.country.toUpperCase()] : []);
    this.countriesCache.set(leaderboardId, { expiresAt: Date.now() + 60 * 60_000, countries });
    return countries;
  }

  private encodeLeaderboardCursor(cursor: { rating: number; id: string; offset: number }) {
    return Buffer.from(JSON.stringify(cursor)).toString('base64url');
  }

  private decodeLeaderboardCursor(value?: string) {
    if (!value) return null;
    try {
      const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<string, unknown>;
      const rating = this.integer(parsed.rating);
      const offset = this.integer(parsed.offset);
      const id = this.text(parsed.id);
      if (rating === null || offset === null || offset < 0 || !id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
      return { rating, id, offset };
    } catch {
      return null;
    }
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
