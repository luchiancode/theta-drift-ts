import { Injectable, Logger } from '@nestjs/common';
import { Observable, defer, forkJoin, map, of } from 'rxjs';
import type { Quote } from '@theta-drift/theta-drift-api/interfaces';
import { QuoteClient } from '../clients/quote.client';
import { QuotesMapper } from './quotes.mapper';
import type { QuotesProvider } from './quotes.provider';

interface CacheEntry {
  quote: Quote;
  storedAt: number;
}

@Injectable()
export class QuotesProviderAdapter implements QuotesProvider {
  private  readonly TTL_MS = 60_000;

  private readonly log = new Logger(QuotesProviderAdapter.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly quoteClient: QuoteClient,
    private readonly quotesMapper: QuotesMapper,
  ) {}

  getQuotesBySymbol(symbols: string[]): Observable<Map<string, Quote>> {
    return defer(() => {
      const wanted = [...new Set(symbols.filter(Boolean))];
      if (wanted.length === 0) {
        return of(new Map<string, Quote>());
      }

      const now = Date.now();
      const cached = new Map<string, Quote>();
      const stale: string[] = [];

      for (const symbol of wanted) {
        const hit = this.cache.get(symbol);
        if (hit && now - hit.storedAt < this.TTL_MS) {
          cached.set(symbol, hit.quote);
        } else {
          stale.push(symbol);
        }
      }

      if (stale.length === 0) {
        return of(cached);
      }

      return forkJoin(stale.map((symbol) => this.fetchQuote(symbol))).pipe(
        map((fetched) => {
          for (const quote of fetched) {
            if (quote !== null) {
              this.cache.set(quote.symbol, { quote, storedAt: Date.now() });
              cached.set(quote.symbol, quote);
            }
          }
          return cached;
        }),
      );
    });
  }

  private fetchQuote(symbol: string): Observable<Quote | null> {
    return this.quoteClient.getQuote(symbol).pipe(
      map((row) => (row ? this.quotesMapper.toQuote(row) : null)),
    );
  }
}

