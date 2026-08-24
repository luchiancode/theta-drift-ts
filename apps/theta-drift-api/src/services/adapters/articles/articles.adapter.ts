import { Injectable, Logger } from '@nestjs/common';
import type { AxiosError, AxiosResponse } from 'axios';
import { Observable, catchError, defer, map, of, throwError } from 'rxjs';
import type { Article } from '@theta-drift/theta-drift-api/interfaces';
import { ArticlesClient, type ArticleDto } from '../clients/articles.client';
import type { ArticlesProvider } from './articles.provider';

const BACKOFF_INITIAL_MS = 120_000;
const BACKOFF_CAP_MS = 1_800_000;
const THROTTLED = new Set([429, 503]);

@Injectable()
export class ArticlesProviderAdapter implements ArticlesProvider {
  readonly name = 'articles';

  private readonly log = new Logger(ArticlesProviderAdapter.name);
  private pausedUntil: number | null = null;
  private strikes = 0;

  constructor(
    private readonly articlesClient: ArticlesClient,
  ) {}

  fetchLatest(): Observable<Omit<Article, 'id'>[]> {
    return defer(() => {
      if (this.pausedUntil !== null && Date.now() < this.pausedUntil) {
        this.log.warn(
          `${this.name}: backing off until ${new Date(this.pausedUntil).toISOString()}`,
        );
        return of([]);
      }

      return this.articlesClient.getTopHeadlines().pipe(
        map((rows) => {
          this.strikes = 0;
          const fetchedAt = new Date();
          return rows
            .map((row) => toArticle(row, fetchedAt))
            .filter((article): article is Omit<Article, 'id'> => article !== null);
        }),
        catchError((error: AxiosError) => {
          const status = error.response?.status;
          if (status !== undefined && THROTTLED.has(status)) {
            this.pause(error.response as AxiosResponse);
            return of<Omit<Article, 'id'>[]>([]);
          }
          return throwError(() => error);
        }),
      );
    });
  }

  private pause(response: AxiosResponse): void {
    this.strikes += 1;
    const wait =
      retryAfterMs(response) ??
      Math.min(BACKOFF_INITIAL_MS * 2 ** (this.strikes - 1), BACKOFF_CAP_MS);
    this.pausedUntil = Date.now() + wait;
  }
}

function retryAfterMs(response: AxiosResponse): number | null {
  const raw = response.headers['retry-after'];
  if (typeof raw !== 'string' || raw === '') {
    return null;
  }
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const until = Date.parse(raw);
  return Number.isNaN(until) ? null : Math.max(0, until - Date.now());
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
