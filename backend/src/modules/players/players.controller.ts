import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthUser, CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LinkPlayerDto, RatingHistoryQueryDto, SearchPlayersDto } from './dto/players.dto';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get('search')
  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  search(@Query() query: SearchPlayersDto) { return this.players.search(query.q); }

  @Post('link')
  @UseGuards(JwtAuthGuard)
  link(@CurrentUser() user: AuthUser, @Body() dto: LinkPlayerDto) {
    return this.players.link(user.sub, dto.profileId);
  }

  @Get(':profileId/rating-history')
  history(@Param('profileId') profileId: string, @Query() query: RatingHistoryQueryDto) {
    return this.players.ratingHistory(profileId, query.range);
  }

  @Get(':profileId')
  get(@Param('profileId') profileId: string) { return this.players.findPublic(profileId); }
}
