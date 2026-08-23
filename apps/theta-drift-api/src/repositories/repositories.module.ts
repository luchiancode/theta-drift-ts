import { Module } from '@nestjs/common';
import { ArticleRepository } from './article.repository';
import { AssetRepository } from './asset.repository';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService, ArticleRepository, AssetRepository],
  exports: [ArticleRepository, AssetRepository],
})
export class RepositoriesModule {}
