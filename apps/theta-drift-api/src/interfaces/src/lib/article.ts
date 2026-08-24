export interface Article {
  id: string;
  externalId: string;
  url: string | null;
  title: string;
  body: string | null;
  image: string | null;
  sourceName: string | null;
  publishedAt: Date;
  fetchedAt: Date;
  ratingStatus: 'PENDING' | 'IN_PROGRESS' | 'RATED' | 'IRRELEVANT' | 'FAILED';
}
