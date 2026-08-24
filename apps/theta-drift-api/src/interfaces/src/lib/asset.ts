export interface Asset {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  aliases: string[];
  inUniverse: boolean;
}
