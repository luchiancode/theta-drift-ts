import { Inject, Injectable, Logger } from '@nestjs/common';
import { Observable, firstValueFrom, map } from 'rxjs';
import {
  LLM_PROVIDER,
  type LlmProvider,
} from '../adapters/llm/llm.provider';
import { ENV, type Env } from '../../config/configuration';
import { newsBlock } from './news';
import { curateVerdictSchema } from './schemas';
import { type RatingState, type UniverseAsset } from './state';

const INSTRUCTIONS = `
You pick which assets a news article might move. You do not score them.

Rules:
- Only emit symbols from the candidate list. Never invent one.
- At most 16. Prefer names the story actually mentions.
- Knock-ons only when the chain is real (OPEC cut -> crude; crude -> airlines).
  Do not stretch. An oil story does not move Apple.
- Broad indices only if the news is big enough to move the index itself.
- Empty list is the common answer for general chatter.
`.trim();

@Injectable()
export class CurateNode {
  private readonly log = new Logger(CurateNode.name);

  constructor(
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
    @Inject(ENV) private readonly env: Env,
  ) {}

  curate(
    title: string,
    body: string,
    candidates: UniverseAsset[],
    limit: number,
  ): Observable<UniverseAsset[]> {
    const known = new Map(
      candidates.map((asset) => [asset.symbol.toUpperCase(), asset]),
    );
    const lines = candidates
      .map((asset) => `${asset.symbol} ${asset.name}`)
      .join('\n');

    return this.llmProvider
      .getVerdict(
        'curate',
        curateVerdictSchema,
        `CANDIDATES:\n${lines}\n\n${INSTRUCTIONS}`,
        newsBlock(title, body),
      )
      .pipe(
        map((verdict) => {
          const picked: UniverseAsset[] = [];
          const seen = new Set<string>();
          const dropped: string[] = [];
          for (const symbol of verdict.symbols) {
            const asset = known.get(symbol.trim().toUpperCase());
            if (asset === undefined) {
              dropped.push(symbol);
              continue;
            }
            if (seen.has(asset.symbol)) {
              continue;
            }
            seen.add(asset.symbol);
            picked.push(asset);
            if (picked.length >= limit) {
              break;
            }
          }
          if (dropped.length > 0) {
            this.log.warn(`Curate dropped unknown symbols ${dropped.join(', ')}`);
          }
          this.log.log(`Curated ${picked.length}/${candidates.length} candidates`);
          return picked;
        }),
      );
  }

  asNode(): (state: RatingState) => Promise<Partial<RatingState>> {
    return async (state) => {
      const limit = this.env.RATING_CANDIDATE_LIMIT;
      const picked = await firstValueFrom(
        this.curate(state.title, state.body ?? '', state.candidates ?? [], limit),
      );

      if (picked.length === 0) {
        this.log.log(
          `No candidates for ${state.articleId} — skipping rating model`,
        );
        return { universe: [], isRelevant: false, ratings: [] };
      }

      this.log.log(
        `Rating universe for ${state.articleId} (${picked.length}): ` +
          picked.map((asset) => asset.symbol).join(', '),
      );
      return { universe: picked };
    };
  }
}
