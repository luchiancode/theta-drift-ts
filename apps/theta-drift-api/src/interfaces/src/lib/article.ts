export interface ProviderArticle {
  externalId: string;
  headline: string;
  body: string | null;
  url: string | null;
  imageUrl: string | null;
  sourceName: string | null;
  publishedAt: Date;
}

export interface Article {
  id: string;
  externalId: string;
  url: string | null;
  headline: string;
  body: string | null;
  imageUrl: string | null;
  sourceName: string | null;
  publishedAt: Date;
  fetchedAt: Date;
  ratingStatus: 'PENDING' | 'IN_PROGRESS' | 'RATED' | 'IRRELEVANT' | 'FAILED';
}
