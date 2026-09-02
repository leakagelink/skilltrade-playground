import type { AssetType, MarketAsset } from "./types";

export interface CatalogEntry extends MarketAsset {
  assetType: AssetType;
  /** Symbol used by the upstream free data source (Yahoo for stocks, Coinbase for crypto). */
  providerSymbol: string;
}

const STOCKS: [string, string][] = [
  ["AAPL", "Apple Inc."],
  ["MSFT", "Microsoft"],
  ["NVDA", "NVIDIA"],
  ["TSLA", "Tesla"],
  ["AMZN", "Amazon"],
  ["GOOGL", "Alphabet"],
  ["META", "Meta Platforms"],
  ["NFLX", "Netflix"],
  ["AMD", "AMD"],
  ["INTC", "Intel"],
  ["BABA", "Alibaba"],
  ["DIS", "Walt Disney"],
  ["JPM", "JPMorgan Chase"],
  ["V", "Visa"],
  ["MA", "Mastercard"],
  ["KO", "Coca-Cola"],
  ["PEP", "PepsiCo"],
  ["NKE", "Nike"],
  ["BA", "Boeing"],
  ["UBER", "Uber"],
  ["COIN", "Coinbase Global"],
  ["PLTR", "Palantir"],
  ["SHOP", "Shopify"],
  ["SBUX", "Starbucks"],
  ["WMT", "Walmart"],
];

const CRYPTOS: [string, string][] = [
  ["BTC", "Bitcoin"],
  ["ETH", "Ethereum"],
  ["SOL", "Solana"],
  ["XRP", "XRP"],
  ["ADA", "Cardano"],
  ["DOGE", "Dogecoin"],
  ["AVAX", "Avalanche"],
  ["LINK", "Chainlink"],
  ["DOT", "Polkadot"],
  ["LTC", "Litecoin"],
  ["MATIC", "Polygon"],
  ["ATOM", "Cosmos"],
  ["UNI", "Uniswap"],
  ["AAVE", "Aave"],
  ["BCH", "Bitcoin Cash"],
];

export const CATALOG: CatalogEntry[] = [
  ...STOCKS.map(([symbol, name]) => ({
    symbol,
    name,
    assetType: "STOCK" as const,
    displaySymbol: `${symbol}/USD`,
    providerSymbol: symbol,
  })),
  ...CRYPTOS.map(([symbol, name]) => ({
    symbol,
    name,
    assetType: "CRYPTO" as const,
    displaySymbol: `${symbol}/USD`,
    providerSymbol: `${symbol}-USD`,
  })),
];


export function catalogEntry(symbol: string): CatalogEntry | undefined {
  return CATALOG.find((a) => a.symbol === symbol.toUpperCase());
}
