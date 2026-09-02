import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AoEProvider } from './aoe-provider.interface';
import { AoEPlayerResult } from './aoe.types';

type RemotePlayer = Record<string, unknown>;

@Injectable()
export class WorldsEdgeAoEProvider implements AoEProvider {
  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return this.config.get<string>('AOE_API_BASE_URL', '').replace(/\/$/, '');
  }

  async searchPlayers(query: string): Promise<AoEPlayerResult[]> {
    const path = `/leaderboard/getLeaderBoard2?title=age2&leaderboard_id=3&search=${encodeURIComponent(query)}&count=10`;
    const rows = this.extractRows(await this.request(path));
    return rows.map((row) => this.normalize(row));
  }

  async getPlayer(profileId: string): Promise<AoEPlayerResult> {
    const path = `/leaderboard/getLeaderBoard2?title=age2&leaderboard_id=3&profile_ids=[${encodeURIComponent(profileId)}]`;
    const row = this.extractRows(await this.request(path))[0];
    if (!row) throw new NotFoundException('AoE player not found');
    return this.normalize(row);
  }

  private async request(path: string): Promise<unknown> {
    if (!this.baseUrl) throw new BadGatewayException('AoE provider is not configured');
    try {
      const response = await fetch(`${this.baseUrl}${path}`, { signal: AbortSignal.timeout(8_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch {
      throw new BadGatewayException('AoE provider is temporarily unavailable');
    }
  }

  private extractRows(payload: unknown): RemotePlayer[] {
    if (!payload || typeof payload !== 'object') return [];
    const source = payload as Record<string, unknown>;
    const rows = source.leaderboard ?? source.items ?? source.result;
    return Array.isArray(rows) ? (rows as RemotePlayer[]) : [];
  }

  private normalize(row: RemotePlayer): AoEPlayerResult {
    const text = (key: string) => (typeof row[key] === 'string' ? (row[key] as string) : undefined);
    const number = (key: string) => (typeof row[key] === 'number' ? (row[key] as number) : null);
    return {
      profileId: String(row.profile_id ?? row.profileId ?? ''),
      nickname: text('name') ?? text('nickname') ?? 'Unknown player',
      steamId: text('steam_id'),
      country: text('country'),
      rating: number('rating'),
      rank: number('rank'),
      peakRating: number('highestrating'),
      wins: number('wins'),
      losses: number('losses'),
      games: number('games'),
    };
  }
}
