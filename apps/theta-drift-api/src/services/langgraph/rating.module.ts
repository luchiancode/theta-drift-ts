import { Module } from '@nestjs/common';
import { AdaptersModule } from '../adapters/adapters.module';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { CurateNode } from './curate.node';
import { RatingGraph } from './graph';
import { RatingOrchestrator } from './orchestrator';
import { RateNode } from './rate.node';

@Module({
  imports: [AdaptersModule, RepositoriesModule],
  providers: [CurateNode, RateNode, RatingGraph, RatingOrchestrator],
  exports: [RatingOrchestrator],
})
export class RatingModule {}
