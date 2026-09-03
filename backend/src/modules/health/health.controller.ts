import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Verifica a disponibilidade da API' })
  @ApiOkResponse({
    description: 'Servico disponivel',
    schema: {
      example: { status: 'ok', service: 'aoe-league-api', timestamp: '2026-09-03T01:21:13.513Z' },
    },
  })
  check() {
    return { status: 'ok', service: 'aoe-league-api', timestamp: new Date().toISOString() };
  }
}
