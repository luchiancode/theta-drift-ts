import { Module } from '@nestjs/common';
import { AdaptersModule } from '../adapters/adapters.module';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { IngestService } from './ingest.service';

@Module({
  imports: [AdaptersModule, RepositoriesModule],
  providers: [IngestService],
  exports: [IngestService],
})
export class IngestModule {}
