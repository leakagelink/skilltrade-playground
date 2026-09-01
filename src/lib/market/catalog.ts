import type { AssetType, MarketAsset } from "./types";

export interface CatalogEntry extends MarketAsset {
  assetType: AssetType;
  /** Symbol used by the upstream free data source (Yahoo for stocks, Coinbase for crypto). */
  providerSymbol: string;
}

export const CATALOG: CatalogEntry[] = [
  { symbol: "AAPL", name: "Apple Inc.", assetType: "STOCK", displaySymbol: "AAPL/USD", providerSymbol: "AAPL" },
  { symbol: "MSFT", name: "Microsoft", assetType: "STOCK", displaySymbol: "MSFT/USD", providerSymbol: "MSFT" },
  { symbol: "NVDA", name: "NVIDIA", assetType: "STOCK", displaySymbol: "NVDA/USD", providerSymbol: "NVDA" },
  { symbol: "TSLA", name: "Tesla", assetType: "STOCK", displaySymbol: "TSLA/USD", providerSymbol: "TSLA" },
  { symbol: "AMZN", name: "Amazon", assetType: "STOCK", displaySymbol: "AMZN/USD", providerSymbol: "AMZN" },
  { symbol: "BTC", name: "Bitcoin", assetType: "CRYPTO", displaySymbol: "BTC/USD", providerSymbol: "BTC-USD" },
  { symbol: "ETH", name: "Ethereum", assetType: "CRYPTO", displaySymbol: "ETH/USD", providerSymbol: "ETH-USD" },
  { symbol: "SOL", name: "Solana", assetType: "CRYPTO", displaySymbol: "SOL/USD", providerSymbol: "SOL-USD" },
];

export function catalogEntry(symbol: string): CatalogEntry | undefined {
  return CATALOG.find((a) => a.symbol === symbol.toUpperCase());
}
