import { Injectable } from '@nestjs/common';
import { Observable, defer, map } from 'rxjs';
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
  constructor(private readonly prismaService: PrismaService) {}

  saveArticles(articles: Omit<Article, 'id'>[]): Observable<number> {
    return defer(() =>
      this.prismaService.article.createMany({
        data: articles,
        skipDuplicates: true,
      }),
    ).pipe(map(({ count }) => count));
  }

  findRatedArticles() {
    return defer(() =>
      this.prismaService.article.findMany({
        where: { ratingStatus: RatingStatus.RATED },
        orderBy: { publishedAt: 'desc' },
        include: articleWithRatings,
      }),
    );
  }

  findArticleById(id: string) {
    return defer(() =>
      this.prismaService.article.findUnique({
        where: { id },
        include: articleWithRatings,
      }),
    );
  }


  findFirstPendingArticle(): Observable<Pick<
    Article,
    'id' | 'title' | 'body' | 'publishedAt'
  > | null> {
    return defer(() =>
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
      this.prismaService.$transaction(async (tx) => {
        const assets = await tx.asset.findMany({
          where: { symbol: { in: ratings.map((rating) => rating.symbol) } },
          select: { id: true, symbol: true },
        });
        const assetIds = new Map(
          assets.map((asset) => [asset.symbol, asset.id]),
        );

        // `symbol` keys the lookups; everything left on `rating` is a column.
        const rows = ratings.flatMap(
          ({ symbol, ...rating }): Prisma.RatingCreateManyInput[] => {
            const assetId = assetIds.get(symbol);
            if (assetId === undefined) {
              return [];
            }
            const quote = quotes.get(symbol);
            return [
              {
                ...rating,
                articleId,
                assetId,
                model,
                promptVersion,
                ratedAt: quote?.quotedAt ?? ratedAt,
                snapshot: quote
                  ? { ...quote, quotedAt: quote.quotedAt?.toISOString() ?? null }
                  : Prisma.DbNull,
              },
            ];
          },
        );

        await tx.rating.deleteMany({ where: { articleId } });
        await tx.rating.createMany({ data: rows });
        await tx.article.update({
          where: { id: articleId },
          data: {
            ratingStatus:
              rows.length > 0 ? RatingStatus.RATED : RatingStatus.IRRELEVANT,
          },
        });
        return rows.length;
      }),
    );
  }

  updateFailedArticle(articleId: string): Observable<void> {
    return defer(() =>
      this.prismaService.article.update({
        where: { id: articleId },
        data: { ratingStatus: RatingStatus.FAILED },
      }),
    ).pipe(map(() => undefined));
  }
}
