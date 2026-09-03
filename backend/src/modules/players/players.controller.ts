import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LinkPlayerDto, RatingHistoryQueryDto, SearchPlayersDto } from './dto/players.dto';
import { PlayersService } from './players.service';

@ApiTags('Players')
@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get('search')
  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  @ApiOperation({ summary: 'Busca jogadores por apelido, profile ID ou Steam ID' })
  @ApiOkResponse({ description: 'Ate 10 jogadores encontrados' })
  search(@Query() query: SearchPlayersDto) { return this.players.search(query.q); }

  @Post('link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Vincula um perfil AoE a conta autenticada' })
  @ApiCreatedResponse({ description: 'Perfil vinculado' })
  @ApiConflictResponse({ description: 'Conta ou perfil ja possui uma vinculacao' })
  @ApiNotFoundResponse({ description: 'Jogador ainda nao esta no cache' })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou invalido' })
  link(@CurrentUser() user: AuthUser, @Body() dto: LinkPlayerDto) {
    return this.players.link(user.sub, dto.profileId);
  }

  @Get(':profileId/rating-history')
  @ApiOperation({ summary: 'Consulta o historico de rating de um jogador' })
  @ApiParam({ name: 'profileId', description: 'Profile ID oficial do jogador', example: '123456789' })
  @ApiOkResponse({ description: 'Snapshots em ordem cronologica' })
  history(@Param('profileId') profileId: string, @Query() query: RatingHistoryQueryDto) {
    return this.players.ratingHistory(profileId, query.range);
  }

  @Get(':profileId')
  @ApiOperation({ summary: 'Consulta o perfil publico de um jogador' })
  @ApiParam({ name: 'profileId', description: 'Profile ID oficial do jogador', example: '123456789' })
  @ApiOkResponse({ description: 'Perfil e rating atual do jogador' })
  @ApiNotFoundResponse({ description: 'Jogador nao encontrado' })
  get(@Param('profileId') profileId: string) { return this.players.findPublic(profileId); }
}
