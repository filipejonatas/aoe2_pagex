import { Module } from '@nestjs/common';
import { WorldsEdgeAoEProvider } from '../../integrations/aoe/worlds-edge.provider';
import { AOE_PROVIDER } from '../../integrations/aoe/aoe-provider.interface';
import { RatingSyncService } from './rating-sync.service';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

@Module({
  controllers: [PlayersController],
  providers: [
    PlayersService,
    RatingSyncService,
    WorldsEdgeAoEProvider,
    { provide: AOE_PROVIDER, useExisting: WorldsEdgeAoEProvider },
  ],
  exports: [PlayersService],
})
export class PlayersModule {}
