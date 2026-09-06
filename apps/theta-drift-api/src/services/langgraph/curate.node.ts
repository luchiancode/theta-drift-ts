import { Inject, Injectable, Logger } from '@nestjs/common';
import { Observable, firstValueFrom, map } from 'rxjs';
import {
  LLM_PROVIDER,
  type LlmProvider,
} from '../adapters/llm/llm.provider';
import type { Asset } from '@theta-drift/theta-drift-api/interfaces';
import { curateVerdictSchema, articlePrompt } from './schemas';
import { type RatingState } from './state';

const CANDIDATE_LIMIT = 16;

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
  ) {}

  curate(
    title: string,
    body: string,
    candidates: Asset[],
  ): Observable<Asset[]> {
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
        articlePrompt(title, body),
      )
      .pipe(
        map((verdict) => {
          const picked: Asset[] = [];
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
            if (picked.length >= CANDIDATE_LIMIT) {
              break;
            }
          }
          if (dropped.length > 0) {
            this.log.warn(`Curate dropped unknown symbols ${dropped.join(', ')}`);
          }
          this.log.log(`Curated ${picked.length}/${candidates.length} candidates`);
          return picked;
        }),

        //TO DO: QUOTE FETCH GOES HERE NOT IN RATE NODE
      );
  }

  async run(state: RatingState): Promise<Partial<RatingState>> {
    const picked = await firstValueFrom(
      this.curate(state.title, state.body ?? '', state.candidates ?? []),
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
  }
}
