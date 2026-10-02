import type { Observable } from 'rxjs';
import type { Article } from '@theta-drift/theta-drift-api/interfaces';
import type { ArticleDto } from '../clients/articles.client';

export interface ArticlesProvider {
  readonly name: string;

  fetchLatest(): Observable<Omit<Article, 'id'>[]>;
  toArticle(raw: ArticleDto, fetchedAt: Date): Omit<Article, 'id'> | null;
}

export const ARTICLES_PROVIDER = Symbol('ARTICLES_PROVIDER');
