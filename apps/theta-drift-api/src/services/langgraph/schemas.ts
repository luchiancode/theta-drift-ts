import { Logger } from '@nestjs/common';
import { z } from 'zod';

/**
 * The shapes the model is asked to fill in. Every `describe()` here is prompt
 * text — it ships to the model as part of the structured-output schema, so the
 * scoring scale is specified once, in the field it constrains.
 */

const log = new Logger('RatingSchema');

export const SCORE_MIN = -100;
export const SCORE_MAX = 100;
export const CONFIDENCE_MIN = 0;
export const CONFIDENCE_MAX = 100;
export const GRADING_WINDOW_MIN = 15;
export const GRADING_WINDOW_MAX = 10_080;

function clamp(value: number, low: number, high: number, field: string): number {
  const clamped = Math.max(low, Math.min(high, value));
  if (clamped !== value) {
    log.warn(
      `Clamped ${field} ${value} -> ${clamped}: model returned a value outside ${low}..${high}`,
    );
  }
  return clamped;
}

export const assetRatingSchema = z
  .array(
    z.object({
      symbol: z.string().describe('Must be exactly one of the universe symbols.'),
      score: z
        .number()
        .transform((value) => clamp(value, SCORE_MIN, SCORE_MAX, 'score'))
        .describe(
          'Directional pressure this news exerts on a -100 to +100 scale. 0 is ' +
            'genuinely neutral. ±1–20 barely detectable, ±21–40 modest, ±41–70 ' +
            'material, ±71–90 large, ±91–100 extreme / thesis-changing. Use the ' +
            'full range; do not cluster on round tens.',
        ),
      confidence: z
        .number()
        .transform((value) =>
          clamp(value, CONFIDENCE_MIN, CONFIDENCE_MAX, 'confidence'),
        )
        .describe('0-100. How sure you are of the direction.'),
      explanation: z
        .string()
        .describe(
          'One or two sentences naming the mechanism. Must say something the ' +
            'headline does not already say.',
        ),
      gradingWindowMinutes: z
        .number()
        .transform((value) =>
          clamp(value, GRADING_WINDOW_MIN, GRADING_WINDOW_MAX, 'gradingWindowMinutes'),
        )
        .describe(
          'Minutes from now until this rating should be graded against the tape. ' +
            '15–60 for breaking news already moving, 120–480 for the same session, ' +
            '1440–10080 when the mechanism needs a day or more. Pick a horizon; ' +
            'do not default every name to the same number.',
        ),
    }),
  )
  .describe(
    'One entry per affected asset. Empty when no asset is affected. Never ' +
      'rate an asset the news does not actually touch.',
  );


export const filterAssetsSchema = z.object({
  symbols: z
    .array(z.string())
    .describe(
      'At most 16 symbols from the candidate list that this article actually ' +
        'pressures. Empty if none. Never invent a symbol.',
    ),
});

export type AssetRating = z.infer<typeof assetRatingSchema>[number];
