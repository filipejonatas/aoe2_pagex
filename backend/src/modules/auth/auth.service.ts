import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayersService } from '../players/players.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly players: PlayersService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email.toLowerCase() }, { username: dto.username }] },
    });
    if (existing) throw new ConflictException('Email or username is already in use');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username: dto.username,
        passwordHash: await hash(dto.password, 12),
      },
      select: { id: true, email: true, username: true, createdAt: true },
    });
    return { user, accessToken: await this.sign(user.id, user.username) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return {
      user: { id: user.id, email: user.email, username: user.username },
      accessToken: await this.sign(user.id, user.username),
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true, email: true, username: true, steamId: true, steamVerifiedAt: true, createdAt: true,
        aoePlayer: { include: { ratings: { where: { leaderboardId: { in: [3, 4] } } } } },
      },
    });
    return { ...user, aoePlayer: user.aoePlayer ? this.players.toPublicPlayer(user.aoePlayer) : null };
  }

  async startSteamVerification(userId: string, inviteCode?: string) {
    await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true } });
    const state = await this.jwt.signAsync(
      { sub: userId, purpose: 'steam-link', ...(inviteCode ? { inviteCode } : {}) },
      { expiresIn: '5m' },
    );
    const returnTo = this.steamReturnTo(state);
    const url = new URL('https://steamcommunity.com/openid/login');
    url.search = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnTo,
      'openid.realm': new URL(this.backendPublicUrl()).origin,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    }).toString();
    return { url: url.toString() };
  }

  async steamCallbackRedirect(query: Record<string, string | string[] | undefined>) {
    const redirect = new URL('/onboarding/aoe', this.frontendUrl());
    try {
      const state = typeof query.state === 'string' ? query.state : '';
      if (!state) throw new BadRequestException('Steam verification state is missing');
      const payload = await this.jwt.verifyAsync<{ sub: string; purpose: string; inviteCode?: string }>(state);
      if (payload.purpose !== 'steam-link' || !payload.sub) throw new UnauthorizedException('Invalid Steam verification state');
      if (payload.inviteCode) redirect.searchParams.set('invite', payload.inviteCode);

      const steamId = await this.verifySteamAssertion(query, state);
      try {
        await this.players.resolveSteamProfile(steamId);
      } catch {
        // Steam ownership remains valid if the optional upstream profile lookup is temporarily unavailable.
      }
      const result = await this.attachSteamIdentity(payload.sub, steamId);
      redirect.searchParams.set('steam', result.profileId ? 'linked' : 'verified');
      if (result.profileId) redirect.searchParams.set('profileId', result.profileId);
    } catch (error) {
      redirect.searchParams.set('steam', 'error');
      redirect.searchParams.set(
        'reason',
        error instanceof ConflictException || error instanceof ForbiddenException ? 'already-linked' : 'invalid-response',
      );
    }
    return redirect.toString();
  }

  private async verifySteamAssertion(query: Record<string, string | string[] | undefined>, state: string) {
    const claimedId = typeof query['openid.claimed_id'] === 'string' ? query['openid.claimed_id'] : '';
    const identity = typeof query['openid.identity'] === 'string' ? query['openid.identity'] : '';
    const returnTo = typeof query['openid.return_to'] === 'string' ? query['openid.return_to'] : '';
    const endpoint = typeof query['openid.op_endpoint'] === 'string' ? query['openid.op_endpoint'] : '';
    if (claimedId !== identity || returnTo !== this.steamReturnTo(state)) {
      throw new BadRequestException('Invalid Steam OpenID response');
    }
    if (endpoint !== 'https://steamcommunity.com/openid/login') {
      throw new BadRequestException('Unexpected Steam OpenID endpoint');
    }

    const verification = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key.startsWith('openid.') && typeof value === 'string') verification.set(key, value);
    }
    verification.set('openid.mode', 'check_authentication');
    const response = await fetch('https://steamcommunity.com/openid/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verification,
      signal: AbortSignal.timeout(10_000),
    });
    const body = await response.text();
    if (!response.ok || !/^is_valid:true$/m.test(body)) {
      throw new UnauthorizedException('Steam did not validate the OpenID assertion');
    }

    const match = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(claimedId);
    if (!match) throw new BadRequestException('Steam ID is invalid');
    return match[1];
  }

  private attachSteamIdentity(userId: string, steamId: string) {
    return this.prisma.$transaction(async (tx) => {
      const [user, steamOwner, player, existingForUser] = await Promise.all([
        tx.user.findUniqueOrThrow({ where: { id: userId } }),
        tx.user.findUnique({ where: { steamId } }),
        tx.aoEPlayer.findUnique({ where: { steamId } }),
        tx.aoEPlayer.findUnique({ where: { userId } }),
      ]);
      if (user.steamId && user.steamId !== steamId) {
        throw new ForbiddenException('This account already verified a different Steam identity');
      }
      if (steamOwner && steamOwner.id !== userId) {
        throw new ConflictException('This Steam identity is already linked to another account');
      }
      if (existingForUser && existingForUser.steamId !== steamId) {
        throw new ConflictException('This account already has a different AoE profile');
      }
      if (player?.userId && player.userId !== userId) {
        throw new ConflictException('This AoE profile is already linked to another account');
      }

      await tx.user.update({
        where: { id: userId },
        data: { steamId, steamVerifiedAt: new Date() },
      });
      if (player && !existingForUser) {
        await tx.aoEPlayer.update({
          where: { id: player.id },
          data: { userId, nextSyncAt: new Date() },
        });
      }
      return { steamId, profileId: player?.profileId ?? existingForUser?.profileId ?? null };
    });
  }

  private frontendUrl() {
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  private backendPublicUrl() {
    return this.config.get<string>('BACKEND_PUBLIC_URL', 'http://localhost:3333');
  }

  private steamReturnTo(state: string) {
    const callback = new URL('/api/v1/auth/steam/callback', this.backendPublicUrl());
    callback.searchParams.set('state', state);
    return callback.toString();
  }

  private sign(sub: string, username: string) {
    return this.jwt.signAsync({ sub, username });
  }
}
