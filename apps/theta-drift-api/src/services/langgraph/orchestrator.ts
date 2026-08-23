import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  Observable,
  catchError,
  concatMap,
  count,
  filter,
  forkJoin,
  map,
  switchMap,
} from 'rxjs';
import {
  LLM_PROVIDER,
  type LlmProvider,
} from '../adapters/llm/llm.provider';
import { ArticleRepository } from '../../repositories/article.repository';
import { AssetRepository } from '../../repositories/asset.repository';
import type { Article, Asset } from '@theta-drift/theta-drift-api/interfaces';
import { RatingGraph } from './graph';
import { PROMPT_VERSION } from './rate.node';
import type { UniverseAsset } from './state';

@Injectable()
export class RatingOrchestrator {
  private readonly log = new Logger(RatingOrchestrator.name);

  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly assetRepository: AssetRepository,
    private readonly ratingGraph: RatingGraph,
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
  ) {}

  processPending(): Observable<number> {
    return forkJoin([
      this.assetRepository.findAssets(),
      this.articleRepository.findFirstPendingArticle(),
    ]).pipe(
      filter(([, article]) => article !== null),
      concatMap(([assets, article]) =>
        this.processOne(
          article,
          assets.filter((asset) => asset.inUniverse).map(toUniverseAsset),
        ),
      ),
      count(),
    );
  }

  private processOne(
    article: Pick<Article, 'id' | 'headline' | 'body' | 'publishedAt'>,
    candidates: UniverseAsset[],
  ): Observable<void> {
    return this.ratingGraph
      .invoke({
        articleId: article.id,
        title: article.headline,
        body: article.body ?? '',
        candidates,
      })
      .pipe(
        switchMap((state) =>
          this.articleRepository.saveRatings(
            article.id,
            (state.ratings ?? []).map((rating) => ({
              symbol: rating.symbol,
              score: rating.score ?? 0,
              confidence: rating.confidence ?? 0,
              explanation: rating.explanation ?? null,
              gradingWindowMinutes: rating.gradingWindowMinutes,
            })),
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
          return this.articleRepository.updateFailedArticle(article.id);
        }),
      );
  }
}

function toUniverseAsset(asset: Asset): UniverseAsset {
  return {
    symbol: asset.quoteSymbol,
    name: asset.name,
    aliases: asset.aliases,
    assetClass: asset.assetClass,
    inUniverse: asset.inUniverse,
  };
}
