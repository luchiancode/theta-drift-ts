import { Module } from '@nestjs/common';
import { IngestModule } from '../ingest/ingest.module';
import { RatingModule } from '../langgraph/rating.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [IngestModule, RatingModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
