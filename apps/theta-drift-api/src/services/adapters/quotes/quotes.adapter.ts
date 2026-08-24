import { Inject, Injectable, Logger } from '@nestjs/common';
import { Observable, defer, forkJoin, map, of } from 'rxjs';
import type { Quote } from '@theta-drift/theta-drift-api/interfaces';
import { QuoteClient, type QuoteDto } from '../clients/quote.client';
import { ENV, type Env } from '../../../config/configuration';
import type { QuotesProvider } from './quotes.provider';

interface CacheEntry {
  quote: Quote;
  storedAt: number;
}

@Injectable()
export class QuotesProviderAdapter implements QuotesProvider {
  private readonly log = new Logger(QuotesProviderAdapter.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly quoteClient: QuoteClient,
    @Inject(ENV) private readonly env: Env,
  ) {}

  quotesFor(symbols: string[]): Observable<Map<string, Quote>> {
    return defer(() => {
      const wanted = [...new Set(symbols.filter(Boolean))];
      if (wanted.length === 0) {
        return of(new Map<string, Quote>());
      }

      const ttl = this.env.QUOTE_TTL_MS;

      const now = Date.now();
      const cached = new Map<string, Quote>();
      const stale: string[] = [];

      for (const symbol of wanted) {
        const hit = this.cache.get(symbol);
        if (hit && now - hit.storedAt < ttl) {
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
      map((row) => (row === undefined ? null : toQuote(row))),
    );
  }
}

function toQuote(raw: QuoteDto): Quote | null {
  const symbol = raw.symbol?.trim();
  if (!symbol) {
    return null;
  }

  const quotedAt =
    typeof raw.timestamp === 'number' && Number.isFinite(raw.timestamp)
      ? new Date(raw.timestamp * 1000)
      : null;

  return {
    symbol,
    exchange: raw.exchange?.trim() || null,
    price: raw.price ?? null,
    change: raw.change ?? null,
    changePercentage: raw.changePercentage ?? null,
    dayLow: raw.dayLow ?? null,
    dayHigh: raw.dayHigh ?? null,
    yearLow: raw.yearLow ?? null,
    yearHigh: raw.yearHigh ?? null,
    marketCap:
      typeof raw.marketCap === 'number' && Number.isFinite(raw.marketCap)
        ? raw.marketCap
        : null,
    priceAvg50: raw.priceAvg50 ?? null,
    priceAvg200: raw.priceAvg200 ?? null,
    volume: raw.volume ?? null,
    open: raw.open ?? null,
    previousClose: raw.previousClose ?? null,
    quotedAt: quotedAt
  };
}
