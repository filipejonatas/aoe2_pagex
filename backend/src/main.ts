import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: config.get('FRONTEND_URL', 'http://localhost:3000'), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(config.get<number>('PORT', 3333));
}

void bootstrap();
