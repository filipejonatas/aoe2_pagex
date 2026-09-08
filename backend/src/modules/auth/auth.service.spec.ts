import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayersService } from '../players/players.service';

describe('AuthService Steam OpenID', () => {
  const prisma = {
    user: { findUniqueOrThrow: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    aoEPlayer: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };
  const jwt = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string, fallback: string) => ({
      FRONTEND_URL: 'http://localhost:3000',
      BACKEND_PUBLIC_URL: 'http://localhost:3333',
    })[key] ?? fallback),
  };
  const players = {
    resolveSteamProfile: jest.fn(),
    toPublicPlayer: jest.fn((player) => player),
  };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    config as unknown as ConfigService,
    players as unknown as PlayersService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (action: (tx: typeof prisma) => unknown) => action(prisma));
  });

  it('builds a Steam-owned OpenID URL with a short-lived signed state', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'user-1' });
    jwt.signAsync.mockResolvedValue('signed-state');

    const result = await service.startSteamVerification('user-1');
    const url = new URL(result.url);

    expect(url.origin + url.pathname).toBe('https://steamcommunity.com/openid/login');
    expect(url.searchParams.get('openid.mode')).toBe('checkid_setup');
    expect(url.searchParams.get('openid.realm')).toBe('http://localhost:3333');
    expect(url.searchParams.get('openid.return_to')).toBe(
      'http://localhost:3333/api/v1/auth/steam/callback?state=signed-state',
    );
    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: 'user-1', purpose: 'steam-link' },
      { expiresIn: '5m' },
    );
  });

  it('keeps a pending league invite inside the signed Steam state', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'user-1' });
    jwt.signAsync.mockResolvedValue('signed-invite-state');

    await service.startSteamVerification('user-1', 'league_invite-123');

    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: 'user-1', purpose: 'steam-link', inviteCode: 'league_invite-123' },
      { expiresIn: '5m' },
    );
  });

  it('restores the pending invite after Steam redirects back', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', purpose: 'steam-link', inviteCode: 'league_invite-123' });
    players.resolveSteamProfile.mockResolvedValue(null);
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'user-1', steamId: null });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.aoEPlayer.findUnique.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({ id: 'user-1' });
    const verify = jest.spyOn(
      service as unknown as { verifySteamAssertion(query: Record<string, string | string[] | undefined>, state: string): Promise<string> },
      'verifySteamAssertion',
    ).mockResolvedValue('76561198000000000');

    const result = new URL(await service.steamCallbackRedirect({ state: 'signed-state' }));

    expect(result.pathname).toBe('/onboarding/aoe');
    expect(result.searchParams.get('invite')).toBe('league_invite-123');
    expect(result.searchParams.get('steam')).toBe('verified');
    verify.mockRestore();
  });

  it('accepts only assertions validated directly by Steam', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response('ns:http://specs.openid.net/auth/2.0\nis_valid:true\n'),
    );
    const state = 'signed-state';
    const returnTo = `http://localhost:3333/api/v1/auth/steam/callback?state=${state}`;
    const query = {
      state,
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
      'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198000000000',
      'openid.identity': 'https://steamcommunity.com/openid/id/76561198000000000',
      'openid.return_to': returnTo,
      'openid.response_nonce': 'nonce',
      'openid.assoc_handle': 'handle',
      'openid.signed': 'signed-fields',
      'openid.sig': 'signature',
    };

    const verifier = service as unknown as {
      verifySteamAssertion(input: Record<string, string>, callbackState: string): Promise<string>;
    };
    await expect(verifier.verifySteamAssertion(query, state)).resolves.toBe('76561198000000000');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://steamcommunity.com/openid/login',
      expect.objectContaining({ method: 'POST' }),
    );
    const request = fetchMock.mock.calls[0][1];
    expect(String(request?.body)).toContain('openid.mode=check_authentication');
    fetchMock.mockRestore();
  });

  it('rejects a callback whose return URL was changed', async () => {
    const verifier = service as unknown as {
      verifySteamAssertion(input: Record<string, string>, callbackState: string): Promise<string>;
    };
    await expect(verifier.verifySteamAssertion({
      state: 'signed-state',
      'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
      'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198000000000',
      'openid.identity': 'https://steamcommunity.com/openid/id/76561198000000000',
      'openid.return_to': 'https://attacker.example/callback',
    }, 'signed-state')).rejects.toThrow('Invalid Steam OpenID response');
  });
});
