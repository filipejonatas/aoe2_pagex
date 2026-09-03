import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateLeagueDto, JoinLeagueDto } from './dto/leagues.dto';
import { LeaguesService } from './leagues.service';

@ApiTags('Leagues')
@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leagues: LeaguesService) {}

  @Post() @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cria uma liga para o usuario autenticado' })
  @ApiCreatedResponse({ description: 'Liga criada com codigo de convite' })
  @ApiConflictResponse({ description: 'E necessario vincular um perfil AoE' })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou invalido' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeagueDto) { return this.leagues.create(user.sub, dto); }

  @Get() @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lista as ligas do usuario autenticado' })
  @ApiOkResponse({ description: 'Ligas das quais o usuario participa' })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou invalido' })
  mine(@CurrentUser() user: AuthUser) { return this.leagues.mine(user.sub); }

  @Get(':slug/leaderboard')
  @ApiOperation({ summary: 'Consulta o leaderboard de uma liga' })
  @ApiParam({ name: 'slug', example: 'liga-dos-amigos-a1b2' })
  @ApiOkResponse({ description: 'Liga e leaderboard calculado' })
  @ApiNotFoundResponse({ description: 'Liga nao encontrada' })
  leaderboard(@Param('slug') slug: string) { return this.leagues.leaderboard(slug); }

  @Get(':slug')
  @ApiOperation({ summary: 'Consulta uma liga pelo slug' })
  @ApiParam({ name: 'slug', example: 'liga-dos-amigos-a1b2' })
  @ApiOkResponse({ description: 'Dados publicos da liga' })
  @ApiNotFoundResponse({ description: 'Liga nao encontrada' })
  get(@Param('slug') slug: string) { return this.leagues.findBySlug(slug); }

  @Post(':leagueId/join') @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Entra em uma liga usando o codigo de convite' })
  @ApiParam({ name: 'leagueId', description: 'UUID da liga' })
  @ApiCreatedResponse({ description: 'Participacao criada' })
  @ApiNotFoundResponse({ description: 'Liga ou convite invalido' })
  @ApiConflictResponse({ description: 'Perfil nao vinculado ou jogador ja participa' })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou invalido' })
  join(@CurrentUser() user: AuthUser, @Param('leagueId') leagueId: string, @Body() dto: JoinLeagueDto) {
    return this.leagues.join(user.sub, leagueId, dto.inviteCode);
  }

  @Delete(':leagueId/members/me') @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove o usuario autenticado de uma liga' })
  @ApiParam({ name: 'leagueId', description: 'UUID da liga' })
  @ApiOkResponse({ description: 'Participacao removida' })
  @ApiForbiddenResponse({ description: 'O proprietario nao pode sair da propria liga' })
  @ApiNotFoundResponse({ description: 'Liga ou participacao nao encontrada' })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou invalido' })
  leave(@CurrentUser() user: AuthUser, @Param('leagueId') leagueId: string) { return this.leagues.leave(user.sub, leagueId); }
}
