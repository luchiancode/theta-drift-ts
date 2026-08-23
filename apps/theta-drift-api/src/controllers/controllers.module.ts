import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { ArticlesController } from './articles.controller';
import { AssetsController } from './assets.controller';
import { HealthController } from './health.controller';

@Module({
  imports: [RepositoriesModule],
  controllers: [HealthController, ArticlesController, AssetsController],
})
export class ControllersModule {}
