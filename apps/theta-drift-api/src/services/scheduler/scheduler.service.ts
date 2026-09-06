import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  Subject,
  catchError,
  defer,
  of,
  repeat,
  takeUntil,
  timer,
} from 'rxjs';
import { ENV, type Env } from '../../config/configuration';
import { IngestService } from '../ingest/ingest.service';
import { RatingOrchestrator } from '../langgraph/orchestrator';

@Injectable()
export class SchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(SchedulerService.name);
  private readonly destroy$ = new Subject<void>();

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly ingestService: IngestService,
    private readonly ratingOrchestrator: RatingOrchestrator,
  ) {}

  onApplicationBootstrap(): void {
    const ingestEnabled = this.env.INGEST_ENABLED;
    const ratingEnabled = this.env.RATING_ENABLED;

    if (!ingestEnabled && !ratingEnabled) {
      this.log.warn('Ingest and rating are both disabled');
      return;
    }

    if (ingestEnabled) {
      this.startIngest();
    }
    if (ratingEnabled) {
      this.startRating();
    }

    this.log.log(
      `Jobs: ingest=${ingestEnabled}/${this.env.INGEST_INTERVAL_SECONDS}s ` +
        `rate=${ratingEnabled}/${this.env.RATING_INTERVAL_SECONDS}s ` +
        `batch=${this.env.RATING_BATCH_SIZE}`,
    );
  }

  onModuleDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  private startIngest(): void {
    const seconds = this.env.INGEST_INTERVAL_SECONDS;

    defer(() => this.ingestService.ingestOnce())
      .pipe(
        catchError((error: unknown) => {
          this.log.error(
            'News ingest failed',
            error instanceof Error ? error.stack : String(error),
          );
          return of(0);
        }),
        repeat({ delay: () => timer(seconds * 1000) }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  private startRating(): void {
    const seconds = this.env.RATING_INTERVAL_SECONDS;

    defer(() => this.ratingOrchestrator.processPending())
      .pipe(
        catchError((error: unknown) => {
          this.log.error(
            'Rating tick failed',
            error instanceof Error ? error.stack : String(error),
          );
          return of(0);
        }),
        repeat({ delay: () => timer(seconds * 1000) }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }
}
