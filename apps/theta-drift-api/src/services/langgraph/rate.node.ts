import { Inject, Injectable, Logger } from '@nestjs/common';
import { Observable, firstValueFrom, map } from 'rxjs';
import {
  LLM_PROVIDER,
  type LlmProvider,
} from '../adapters/llm/llm.provider';
import type { Asset, Quote } from '@theta-drift/theta-drift-api/interfaces';
import { verdictSchema, articlePrompt } from './schemas';
import { type RatingState } from './state';

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
  ) {}

  rate(
    articleId: string,
    title: string,
    body: string,
    universe: Asset[],
    quotes: Map<string, Quote>,
  ): Observable<Partial<RatingState>> {
    const ratedAt = new Date();
    return this.llmProvider
      .getVerdict(
        'rate',
        verdictSchema,
        this.systemInstruction(universe, quotes, ratedAt),
        articlePrompt(title, body),
      )
      .pipe(
        map((verdict) => {
          const known = new Set(universe.map((asset) => asset.symbol));
          const kept = [];
          const dropped = [];
          for (const rating of verdict.ratings) {
            if (known.has(rating.symbol)) {
              kept.push(rating);
            } else {
              dropped.push(rating);
            }
          }
          if (dropped.length > 0) {
            this.log.warn(
              `Dropped out-of-universe symbols ` +
                `${dropped.map((rating) => rating.symbol).join(', ')} on ${articleId}`,
            );
          }
          return {
            isRelevant: verdict.isRelevant,
            ratings: kept,
            ratedAt,
          };
        }),
      );
  }

  async run(state: RatingState): Promise<Partial<RatingState>> {
    return firstValueFrom(
      this.rate(
        state.articleId,
        state.title,
        state.body ?? '',
        state.universe ?? [],
        state.quotes ?? new Map(),
      ),
    );
  }

  private systemInstruction(
    universe: Asset[],
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
      tapes.push(this.tapeBlock(symbol, quote, ratedAt));
    }
    const tape =
      tapes.length > 0 ? `\n\nTAPE:\n${tapes.join('\n\n')}` : '';
    return `UNIVERSE:\n${lines.join('\n')}\n\n${INSTRUCTIONS}${tape}`;
  }

  private tapeBlock(symbol: string, quote: Quote, ratedAt: Date): string {
    const lines = [
      `${symbol} as of ${this.stamp(ratedAt)}`,
      `last: ${this.n(quote.price)}  chg ${this.n(quote.change)} (${this.pct(quote.changePercentage)})  prev close ${this.n(quote.previousClose)}`,
      `day range: ${this.n(quote.dayLow)} – ${this.n(quote.dayHigh)}  open ${this.n(quote.open)}  vol ${this.vol(quote.volume)}`,
      `52w range: ${this.n(quote.yearLow)} – ${this.n(quote.yearHigh)}`,
    ];

    const averages: string[] = [];
    if (quote.priceAvg50 !== null) {
      averages.push(
        `50d avg ${this.n(quote.priceAvg50)}${this.relative(quote.price, quote.priceAvg50)}`,
      );
    }
    if (quote.priceAvg200 !== null) {
      averages.push(
        `200d avg ${this.n(quote.priceAvg200)}${this.relative(quote.price, quote.priceAvg200)}`,
      );
    }
    if (averages.length > 0) {
      lines.push(averages.join('  '));
    }

    return lines.join('\n');
  }

  private relative(price: number | null, average: number): string {
    if (price === null || average === 0) {
      return '';
    }
    return ` (price ${this.pct(((price - average) / average) * 100)})`;
  }

  private stamp(ratedAt: Date): string {
    return `${ratedAt.toISOString().slice(0, 16).replace('T', ' ')}Z`;
  }

  private n(value: number | null, digits = 2): string {
    return value === null ? '—' : value.toFixed(digits);
  }

  private pct(value: number | null): string {
    if (value === null) {
      return '—';
    }
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  private vol(volume: number | null): string {
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
}
