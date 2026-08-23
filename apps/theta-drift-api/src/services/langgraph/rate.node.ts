import { Inject, Injectable, Logger } from '@nestjs/common';
import { Observable, firstValueFrom, map, switchMap } from 'rxjs';
import {
  LLM_PROVIDER,
  type LlmProvider,
} from '../adapters/llm/llm.provider';
import {
  QUOTES_PROVIDER,
  type QuotesProvider,
} from '../adapters/quotes/quotes.provider';
import type { Quote } from '@theta-drift/theta-drift-api/interfaces';
import { newsBlock } from './news';
import { verdictSchema } from './schemas';
import { type RatingState, type UniverseAsset } from './state';

export const PROMPT_VERSION = 'graph-v3';

const INSTRUCTIONS = `
You rate financial news for how it pressures a fixed universe of assets.

Rules:
- Only ever use symbols from the universe above. Never invent one.
- Most general financial news moves none of these assets. Say so: set
  isRelevant to false and return no ratings. That is the common answer.
- Rate knock-on effects when the causal chain is real (an OPEC supply cut
  lifts crude, and lifts fuel costs for airlines), but never stretch. An oil
  story does not move Apple.
- Do not tag a broad index for a single company's news unless the news is
  big enough to move the index itself.
- The explanation is the product. Name the mechanism; do not restate the
  headline.
- gradingWindowMinutes is when the tape should be checked. Match it to how
  fast this mechanism should show up, not a habit number.
- When a TAPE block is present: last price, day and 52-week range, 50- and
  200-day averages. Use it to judge whether the name is stretched or washed
  out. If the news and the tape agree, the move may already be priced in;
  if they disagree, the news is fighting the tape. Do not copy the tape's
  direction as the rating. Do not ignore the news and rate the chart alone.
  Names without a tape block are still rateable.
`.trim();

@Injectable()
export class RateNode {
  private readonly log = new Logger(RateNode.name);

  constructor(
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
    @Inject(QUOTES_PROVIDER) private readonly quotesProvider: QuotesProvider,
  ) {}

  rate(
    articleId: string,
    title: string,
    body: string,
    universe: UniverseAsset[],
  ): Observable<Partial<RatingState>> {
    const ratedAt = new Date();
    return this.quotesFor(universe).pipe(
      switchMap((quotes) =>
        this.llmProvider
          .getVerdict(
            'rate',
            verdictSchema,
            systemInstruction(universe, quotes, ratedAt),
            newsBlock(title, body),
          )
          .pipe(
            map((verdict) => {
              const known = new Set(universe.map((asset) => asset.symbol));
              const kept = verdict.ratings.filter((rating) =>
                known.has(rating.symbol),
              );
              const dropped = verdict.ratings.filter(
                (rating) => !known.has(rating.symbol),
              );
              if (dropped.length > 0) {
                this.log.warn(
                  `Dropped out-of-universe symbols ` +
                    `${dropped.map((rating) => rating.symbol).join(', ')} on ${articleId}`,
                );
              }
              return {
                isRelevant: verdict.isRelevant,
                ratings: kept,
                quotes,
                ratedAt,
              };
            }),
          ),
      ),
    );
  }

  asNode(): (state: RatingState) => Promise<Partial<RatingState>> {
    return async (state) =>
      firstValueFrom(
        this.rate(
          state.articleId,
          state.title,
          state.body ?? '',
          state.universe ?? [],
        ),
      );
  }

  private quotesFor(universe: UniverseAsset[]): Observable<Map<string, Quote>> {
    const symbols = [
      ...new Set(universe.map((asset) => asset.symbol).filter(Boolean)),
    ];
    return this.quotesProvider.quotesFor(symbols);
  }
}

function systemInstruction(
  universe: UniverseAsset[],
  quotes: Map<string, Quote>,
  ratedAt: Date,
): string {
  const lines = universe.map((asset) =>
    asset.aliases.length > 0
      ? `- ${asset.symbol}: ${asset.name} (also called: ${asset.aliases.join(', ')})`
      : `- ${asset.symbol}: ${asset.name}`,
  );
  const tapes: string[] = [];
  for (const [symbol, quote] of quotes) {
    tapes.push(tapeBlock(symbol, quote, ratedAt));
  }
  const tape =
    tapes.length > 0 ? `\n\nTAPE:\n${tapes.join('\n\n')}` : '';
  return `UNIVERSE:\n${lines.join('\n')}\n\n${INSTRUCTIONS}${tape}`;
}

function tapeBlock(symbol: string, quote: Quote, ratedAt: Date): string {
  const lines = [
    `${symbol} as of ${stamp(ratedAt)}`,
    `last: ${n(quote.price)}  chg ${n(quote.change)} (${pct(quote.changePercentage)})  prev close ${n(quote.previousClose)}`,
    `day range: ${n(quote.dayLow)} – ${n(quote.dayHigh)}  open ${n(quote.open)}  vol ${vol(quote.volume)}`,
    `52w range: ${n(quote.yearLow)} – ${n(quote.yearHigh)}`,
  ];

  const averages: string[] = [];
  if (quote.priceAvg50 !== null) {
    averages.push(
      `50d avg ${n(quote.priceAvg50)}${relative(quote.price, quote.priceAvg50)}`,
    );
  }
  if (quote.priceAvg200 !== null) {
    averages.push(
      `200d avg ${n(quote.priceAvg200)}${relative(quote.price, quote.priceAvg200)}`,
    );
  }
  if (averages.length > 0) {
    lines.push(averages.join('  '));
  }

  return lines.join('\n');
}

function relative(price: number | null, average: number): string {
  if (price === null || average === 0) {
    return '';
  }
  return ` (price ${pct(((price - average) / average) * 100)})`;
}

function stamp(ratedAt: Date): string {
  return `${ratedAt.toISOString().slice(0, 16).replace('T', ' ')}Z`;
}

function n(value: number | null, digits = 2): string {
  return value === null ? '—' : value.toFixed(digits);
}

function pct(value: number | null): string {
  if (value === null) {
    return '—';
  }
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function vol(volume: number | null): string {
  if (volume === null || volume === 0) {
    return '—';
  }
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`;
  }
  return volume.toFixed(0);
}
