import { AoEPlayerResult } from './aoe.types';

export const AOE_PROVIDER = Symbol('AOE_PROVIDER');

export interface AoEProvider {
  searchPlayers(query: string): Promise<AoEPlayerResult[]>;
  getPlayer(profileId: string): Promise<AoEPlayerResult>;
}
