export interface Quote {
  symbol: string;
  exchange: string | null;
  price: number | null;
  change: number | null;
  changePercentage: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  yearLow: number | null;
  yearHigh: number | null;
  marketCap: number | null;
  priceAvg50: number | null;
  priceAvg200: number | null;
  volume: number | null;
  open: number | null;
  previousClose: number | null;
  quotedAt: Date | null;
}
