import { Injectable, Logger } from '@nestjs/common';
import { Observable, defer, from, map } from 'rxjs';
import type {
  Article,
  Quote,
} from '@theta-drift/theta-drift-api/interfaces';
import { Prisma, RatingStatus } from '../generated/prisma/client';
import { PrismaService } from './prisma.service';

const articleWithRatings = {
  ratings: { include: { asset: true } },
} as const;

@Injectable()
export class ArticleRepository {
  private readonly log = new Logger(ArticleRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  saveArticles(articles: Omit<Article, 'id'>[]): Observable<number> {
    return defer(() =>
      from(
        this.prismaService.article.createMany({
          data: articles,
          skipDuplicates: true,
        }),
      ),
    ).pipe(map(({ count }) => count));
  }

  findRatedArticles() {
    return defer(() =>
      from(
        this.prismaService.article.findMany({
          where: { ratingStatus: RatingStatus.RATED },
          orderBy: { publishedAt: 'desc' },
          include: articleWithRatings,
        }),
      ),
    );
  }

  findArticleById(id: string) {
    return defer(() =>
      from(
        this.prismaService.article.findUnique({
          where: { id },
          include: articleWithRatings,
        }),
      ),
    );
  }


  findFirstPendingArticle(): Observable<Pick<
    Article,
    'id' | 'title' | 'body' | 'publishedAt'
  > | null> {
    return defer(() =>
      from(
        this.prismaService.$queryRaw<
          Pick<Article, 'id' | 'title' | 'body' | 'publishedAt'>[]
        >`
          UPDATE article
             SET rating_status = 'IN_PROGRESS'::rating_status
           WHERE id = (
                 SELECT id
                   FROM article
                  WHERE rating_status = 'PENDING'::rating_status
                  ORDER BY published_at ASC
                  LIMIT 1
                    FOR UPDATE SKIP LOCKED
           )
       RETURNING id, title, body, published_at AS "publishedAt"
        `,
      ),
    ).pipe(map((rows) => rows[0] ?? null));
  }

  /** Replace this article's ratings and set its final status, in one transaction. */
  saveRatings(
    articleId: string,
    ratings: {
      symbol: string;
      score: number;
      confidence: number;
      explanation: string | null;
      gradingWindowMinutes: number;
    }[],
    quotes: Map<string, Quote>,
    ratedAt: Date,
    model: string,
    promptVersion: string,
  ): Observable<number> {
    return defer(() =>
      from(
        this.prismaService.$transaction(async (tx) => {
          const assets = await tx.asset.findMany({
            where: {
              symbol: { in: ratings.map((rating) => rating.symbol) },
            },
            select: { id: true, symbol: true },
          });
          const assetIds = new Map(
            assets.map((asset) => [asset.symbol, asset.id]),
          );

          const rows = [];
          for (const rating of ratings) {
            const assetId = assetIds.get(rating.symbol);
            if (assetId === undefined) {
              this.log.warn(
                `Unknown symbol ${rating.symbol} on ${articleId}; skipping`,
              );
              continue;
            }
            const quote = quotes.get(rating.symbol);
            rows.push({
              articleId,
              assetId,
              score: rating.score,
              confidence: rating.confidence,
              explanation: rating.explanation,
              model,
              promptVersion,
              ratedAt: quote?.quotedAt ?? ratedAt,
              gradingWindowMinutes: rating.gradingWindowMinutes,
              snapshot: quote ?? Prisma.DbNull,
            });
          }

          await tx.rating.deleteMany({ where: { articleId } });
          if (rows.length > 0) {
            await tx.rating.createMany({ data: rows });
          }

          const ratingStatus =
            rows.length > 0 ? RatingStatus.RATED : RatingStatus.IRRELEVANT;
          await tx.article.update({
            where: { id: articleId },
            data: { ratingStatus },
          });

          this.log.log(
            `Rated ${articleId} as ${ratingStatus} with ${rows.length} rating(s) [${model}]`,
          );
          return rows.length;
        }),
      ),
    );
  }

  updateFailedArticle(articleId: string): Observable<void> {
    return defer(() =>
      from(
        this.prismaService.article.update({
          where: { id: articleId },
          data: { ratingStatus: RatingStatus.FAILED },
        }),
      ),
    ).pipe(map(() => undefined));
  }
}
