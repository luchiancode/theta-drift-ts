import type { Observable } from 'rxjs';
import type { Quote } from '@theta-drift/theta-drift-api/interfaces';
import type { QuoteDto } from '../clients/quote.client';

export interface QuotesProvider {
  getQuotesBySymbol(symbols: string[]): Observable<Map<string, Quote>>;
  toQuote(raw: QuoteDto | null | undefined): Quote | null;
}

export const QUOTES_PROVIDER = Symbol('QUOTES_PROVIDER');
