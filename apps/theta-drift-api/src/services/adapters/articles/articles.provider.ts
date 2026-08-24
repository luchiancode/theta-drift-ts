import type { Observable } from 'rxjs';
import type { Article } from '@theta-drift/theta-drift-api/interfaces';

export interface ArticlesProvider {
  readonly name: string;

  fetchLatest(): Observable<Omit<Article, 'id'>[]>;
}

export const ARTICLES_PROVIDER = Symbol('ARTICLES_PROVIDER');
