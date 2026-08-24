import { Injectable, Logger } from '@nestjs/common';
import type { AxiosError } from 'axios';
import { Observable, catchError, delay, map, of, throwError } from 'rxjs';
import type { Article } from '@theta-drift/theta-drift-api/interfaces';
import { ArticlesClient, type ArticleDto } from '../clients/articles.client';
import type { ArticlesProvider } from './articles.provider';

const BACKOFF_MS = 5 * 60 * 1000;
const THROTTLED = new Set([429, 503]);

@Injectable()
export class ArticlesProviderAdapter implements ArticlesProvider {
  readonly name = 'articles';

  private readonly log = new Logger(ArticlesProviderAdapter.name);

  constructor(
    private readonly articlesClient: ArticlesClient,
  ) {}

  fetchLatest(): Observable<Omit<Article, 'id'>[]> {
    return this.articlesClient.getTopHeadlines().pipe(
      map((rows) => {
        const fetchedAt = new Date();
        return rows
          .map((row) => toArticle(row, fetchedAt))
          .filter((article) => !!article)
      }),
      catchError((error: AxiosError) => {
        const status = error.response?.status;
        if (status !== undefined && THROTTLED.has(status)) {
          this.log.warn(`${this.name}: backing off`);
          return of<Omit<Article, 'id'>[]>([]).pipe(delay(BACKOFF_MS));
        }
        return throwError(() => error);
      }),
    );
  }
}

function toArticle(raw: ArticleDto, fetchedAt: Date): Omit<Article, 'id'> | null {
  const externalId = raw.id?.trim();
  const title = raw.title?.trim();
  const publishedAt = raw.publishedAt ? new Date(raw.publishedAt) : null;
  if (
    !externalId ||
    !title ||
    publishedAt === null ||
    Number.isNaN(publishedAt.getTime())
  ) {
    return null;
  }

  return {
    externalId,
    title,
    body: raw.description?.trim() || raw.content?.trim() || null,
    url: raw.url?.trim() || null,
    image: raw.image?.trim() || null,
    sourceName: raw.source?.name?.trim() || null,
    publishedAt,
    fetchedAt,
    ratingStatus: 'PENDING',
  };
}
