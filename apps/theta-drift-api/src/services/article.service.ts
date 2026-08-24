import { Injectable } from '@nestjs/common';
import type { Quote } from '@theta-drift/theta-drift-api/interfaces';
import { ArticleRepository } from '../repositories/article.repository';
import type { AssetRating } from './langgraph/schemas';

@Injectable()
export class ArticleService {
  constructor(private readonly articleRepository: ArticleRepository) {}

  findFirstPendingArticle() {
    return this.articleRepository.findFirstPendingArticle();
  }

  saveRatings(
    articleId: string,
    ratings: AssetRating[],
    quotes: Map<string, Quote>,
    ratedAt: Date,
    model: string,
    promptVersion: string,
  ) {
    return this.articleRepository.saveRatings(
      articleId,
      ratings.map((rating) => ({
        symbol: rating.symbol,
        score: rating.score ?? 0,
        confidence: rating.confidence ?? 0,
        explanation: rating.explanation ?? null,
        gradingWindowMinutes: rating.gradingWindowMinutes,
      })),
      quotes,
      ratedAt,
      model,
      promptVersion,
    );
  }

  updateFailedArticle(articleId: string) {
    return this.articleRepository.updateFailedArticle(articleId);
  }
}
