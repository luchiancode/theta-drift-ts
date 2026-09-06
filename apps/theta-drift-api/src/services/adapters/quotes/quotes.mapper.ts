import { Injectable } from '@nestjs/common';
import type { Quote } from '@theta-drift/theta-drift-api/interfaces';
import type { QuoteDto } from '../clients/quote.client';

@Injectable()
export class QuotesMapper {
  toQuote(raw: QuoteDto): Quote | null {
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
      quotedAt: quotedAt,
    };
  }
}
