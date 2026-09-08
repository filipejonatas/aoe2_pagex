import { Body, Controller, Get, Post, Query, Redirect, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, SteamStartDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Cria uma conta' })
  @ApiCreatedResponse({ description: 'Conta criada e token JWT emitido' })
  @ApiConflictResponse({ description: 'E-mail ou nome de usuario ja esta em uso' })
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }

  @Post('login')
  @ApiOperation({ summary: 'Autentica com e-mail e senha' })
  @ApiCreatedResponse({ description: 'Credenciais validas e token JWT emitido' })
  @ApiUnauthorizedResponse({ description: 'Credenciais invalidas' })
  login(@Body() dto: LoginDto) { return this.auth.login(dto); }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Retorna o usuario autenticado' })
  @ApiOkResponse({ description: 'Dados da conta e perfil AoE vinculado' })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou invalido' })
  me(@CurrentUser() user: AuthUser) { return this.auth.me(user.sub); }

  @Post('steam/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Inicia a verificacao de identidade via Steam OpenID' })
  @ApiOkResponse({ description: 'URL oficial da Steam para autenticacao' })
  startSteam(@CurrentUser() user: AuthUser, @Body() dto: SteamStartDto) {
    return this.auth.startSteamVerification(user.sub, dto.inviteCode);
  }

  @Get('steam/callback')
  @Redirect()
  @ApiOperation({ summary: 'Valida o callback Steam OpenID e retorna ao onboarding' })
  async steamCallback(@Query() query: Record<string, string | string[] | undefined>) {
    return { url: await this.auth.steamCallbackRedirect(query), statusCode: 302 };
  }
}
