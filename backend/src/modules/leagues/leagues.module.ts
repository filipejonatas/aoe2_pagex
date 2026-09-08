import { Module } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { LeaguesController } from './leagues.controller';
import { LeaguesService } from './leagues.service';

@Module({ controllers: [LeaguesController], providers: [LeaguesService, OptionalJwtAuthGuard] })
export class LeaguesModule {}
