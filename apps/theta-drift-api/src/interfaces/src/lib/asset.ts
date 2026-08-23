export interface Asset {
  id: string;
  quoteSymbol: string;
  name: string;
  assetClass: string;
  aliases: string[];
  inUniverse: boolean;
}
