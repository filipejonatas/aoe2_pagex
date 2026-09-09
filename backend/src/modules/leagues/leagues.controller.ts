import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { AddLeaguePlayerDto, CreateLeagueDto, JoinLeagueDto, LeagueLeaderboardQueryDto } from './dto/leagues.dto';
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

  @Get(':slug/leaderboard') @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Consulta o leaderboard de uma liga' })
  @ApiParam({ name: 'slug', example: 'liga-dos-amigos-a1b2' })
  @ApiOkResponse({ description: 'Liga e leaderboard calculado' })
  @ApiNotFoundResponse({ description: 'Liga nao encontrada' })
  leaderboard(
    @CurrentUser() user: AuthUser | null,
    @Param('slug') slug: string,
    @Query() query: LeagueLeaderboardQueryDto,
  ) {
    return this.leagues.leaderboard(slug, query.leaderboardId, user?.sub);
  }

  @Get(':slug') @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Consulta uma liga pelo slug' })
  @ApiParam({ name: 'slug', example: 'liga-dos-amigos-a1b2' })
  @ApiOkResponse({ description: 'Dados publicos da liga' })
  @ApiNotFoundResponse({ description: 'Liga nao encontrada' })
  get(@CurrentUser() user: AuthUser | null, @Param('slug') slug: string) {
    return this.leagues.findBySlug(slug, user?.sub);
  }

  @Post('join') @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Entra em uma liga usando apenas o codigo de convite' })
  @ApiCreatedResponse({ description: 'Participacao criada' })
  @ApiNotFoundResponse({ description: 'Convite invalido' })
  @ApiConflictResponse({ description: 'Perfil nao vinculado ou jogador ja participa' })
  joinByCode(@CurrentUser() user: AuthUser, @Body() dto: JoinLeagueDto) {
    return this.leagues.joinByCode(user.sub, dto.inviteCode);
  }

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

  @Post(':leagueId/members') @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Adiciona um jogador ao ranking da liga' })
  @ApiParam({ name: 'leagueId', description: 'UUID da liga' })
  @ApiCreatedResponse({ description: 'Jogador adicionado ou participacao existente' })
  @ApiForbiddenResponse({ description: 'Somente o proprietario pode adicionar jogadores' })
  @ApiNotFoundResponse({ description: 'Liga ou jogador nao encontrado' })
  addPlayer(
    @CurrentUser() user: AuthUser,
    @Param('leagueId') leagueId: string,
    @Body() dto: AddLeaguePlayerDto,
  ) {
    return this.leagues.addPlayer(user.sub, leagueId, dto.profileId);
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

  @Delete(':leagueId/members/:profileId') @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove um jogador do ranking da liga' })
  @ApiParam({ name: 'leagueId', description: 'UUID da liga' })
  @ApiParam({ name: 'profileId', description: 'Profile ID oficial do jogador' })
  @ApiOkResponse({ description: 'Jogador removido da liga' })
  @ApiForbiddenResponse({ description: 'Somente o proprietario pode remover jogadores, e ele nao pode remover a si mesmo' })
  @ApiNotFoundResponse({ description: 'Liga, jogador ou participacao nao encontrada' })
  removePlayer(
    @CurrentUser() user: AuthUser,
    @Param('leagueId') leagueId: string,
    @Param('profileId') profileId: string,
  ) {
    return this.leagues.removePlayer(user.sub, leagueId, profileId);
  }
}
