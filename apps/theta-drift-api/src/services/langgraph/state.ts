import { Annotation } from '@langchain/langgraph';
import type { Quote } from '@theta-drift/theta-drift-api/interfaces';
import type { AssetRating } from './schemas';

/** The rateable universe as the graph sees it, decoupled from the database row. */
export interface UniverseAsset {
  symbol: string;
  name: string;
  aliases: string[];
  assetClass: string;
  inUniverse: boolean;
}

export const RatingStateAnnotation = Annotation.Root({
  articleId: Annotation<string>,
  title: Annotation<string>,
  body: Annotation<string>,
  candidates: Annotation<UniverseAsset[]>,
  universe: Annotation<UniverseAsset[]>,
  isRelevant: Annotation<boolean>,
  ratings: Annotation<AssetRating[]>,
  quotes: Annotation<Map<string, Quote>>,
  ratedAt: Annotation<Date>,
});

export type RatingState = typeof RatingStateAnnotation.State;
