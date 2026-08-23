import type { Observable } from 'rxjs';
import type { ProviderArticle } from '@theta-drift/theta-drift-api/interfaces';

export interface ArticlesProvider {
  readonly name: string;

  fetchLatest(): Observable<ProviderArticle[]>;
}

export const ARTICLES_PROVIDER = Symbol('ARTICLES_PROVIDER');
