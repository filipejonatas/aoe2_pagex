import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateLeagueDto, JoinLeagueDto } from './dto/leagues.dto';
import { LeaguesService } from './leagues.service';

@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leagues: LeaguesService) {}

  @Post() @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeagueDto) { return this.leagues.create(user.sub, dto); }

  @Get() @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthUser) { return this.leagues.mine(user.sub); }

  @Get(':slug/leaderboard')
  leaderboard(@Param('slug') slug: string) { return this.leagues.leaderboard(slug); }

  @Get(':slug')
  get(@Param('slug') slug: string) { return this.leagues.findBySlug(slug); }

  @Post(':leagueId/join') @UseGuards(JwtAuthGuard)
  join(@CurrentUser() user: AuthUser, @Param('leagueId') leagueId: string, @Body() dto: JoinLeagueDto) {
    return this.leagues.join(user.sub, leagueId, dto.inviteCode);
  }

  @Delete(':leagueId/members/me') @UseGuards(JwtAuthGuard)
  leave(@CurrentUser() user: AuthUser, @Param('leagueId') leagueId: string) { return this.leagues.leave(user.sub, leagueId); }
}
