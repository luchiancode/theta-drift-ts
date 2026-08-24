import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadedEnv } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.enableCors();

  const port = loadedEnv().PORT;
  await app.listen(port);
  Logger.log(`Theta Drift API listening on http://localhost:${port}`);
}

bootstrap();
