import type { Observable } from 'rxjs';
import type { Quote } from '@theta-drift/theta-drift-api/interfaces';

export interface QuotesProvider {
  getQuotesBySymbol(symbols: string[]): Observable<Map<string, Quote>>;
}

export const QUOTES_PROVIDER = Symbol('QUOTES_PROVIDER');
