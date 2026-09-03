import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: config.get('FRONTEND_URL', 'http://localhost:3000'), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AoE2 PageX API')
    .setDescription('API de jogadores, ratings e ligas da comunidade de Age of Empires II: Definitive Edition.')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token retornado por /api/v1/auth/login' },
      'access-token',
    )
    .addTag('Health', 'Disponibilidade do servico')
    .addTag('Auth', 'Cadastro, login e usuario autenticado')
    .addTag('Players', 'Busca, vinculacao e historico de jogadores')
    .addTag('Leagues', 'Gerenciamento de ligas e leaderboards')
    .build();

  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, swaggerConfig), {
    customSiteTitle: 'AoE2 PageX API Docs',
    jsonDocumentUrl: 'docs-json',
    yamlDocumentUrl: 'docs-yaml',
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(config.get<number>('PORT', 3333), '0.0.0.0');
}

void bootstrap();
