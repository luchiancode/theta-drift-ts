import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  EMPTY,
  Observable,
  catchError,
  concatMap,
  count,
  forkJoin,
  map,
  switchMap,
} from 'rxjs';
import {
  LLM_PROVIDER,
  type LlmProvider,
} from '../adapters/llm/llm.provider';
import { ArticleService } from '../article.service';
import { AssetService } from '../asset.service';
import type { Article, Asset } from '@theta-drift/theta-drift-api/interfaces';
import { RatingGraph } from './graph';
import { PROMPT_VERSION } from './rate.node';

@Injectable()
export class RatingOrchestrator {
  private readonly log = new Logger(RatingOrchestrator.name);

  constructor(
    private readonly articleService: ArticleService,
    private readonly assetService: AssetService,
    private readonly ratingGraph: RatingGraph,
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
  ) {}

  processPending(): Observable<number> {
    return forkJoin([
      this.assetService.findAssets(),
      this.articleService.findFirstPendingArticle(),
    ]).pipe(
      concatMap(([assets, article]) => {
        if (article === null) {
          return EMPTY;
        }
        return this.processOne(
          article,
          assets.filter((asset) => asset.inUniverse),
        );
      }),
      count(),
    );
  }

  private processOne(
    article: Pick<Article, 'id' | 'title' | 'body' | 'publishedAt'>,
    candidates: Asset[],
  ): Observable<void> {
    return this.ratingGraph
      .invoke({
        articleId: article.id,
        title: article.title,
        body: article.body ?? '',
        candidates,
      })
      .pipe(
        switchMap((state) =>
          this.articleService.saveRatings(
            article.id,
            state.ratings ?? [],
            state.quotes ?? new Map(),
            state.ratedAt ?? new Date(),
            this.llmProvider.modelFor('rate'),
            PROMPT_VERSION,
          ),
        ),
        map(() => undefined),
        catchError((error: unknown) => {
          this.log.error(
            `Rating failed for ${article.id}`,
            error instanceof Error ? error.stack : String(error),
          );
          return this.articleService.updateFailedArticle(article.id);
        }),
      );
  }
}
