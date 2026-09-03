import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
import { LoginDto, RegisterDto } from './dto/auth.dto';
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
}
