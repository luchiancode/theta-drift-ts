import { Annotation } from '@langchain/langgraph';
import type { Asset, Quote } from '@theta-drift/theta-drift-api/interfaces';
import type { AssetRating } from './schemas';

export const RatingStateAnnotation = Annotation.Root({
  articleId: Annotation<string>,
  title: Annotation<string>,
  body: Annotation<string>,
  candidates: Annotation<Asset[]>,
  universe: Annotation<Asset[]>,
  isRelevant: Annotation<boolean>,
  ratings: Annotation<AssetRating[]>,
  quotes: Annotation<Map<string, Quote>>,
  ratedAt: Annotation<Date>,
});

export type RatingState = typeof RatingStateAnnotation.State;
