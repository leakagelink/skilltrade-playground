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

/** Indian NSE shares (Yahoo ".NS" symbols). Prices are converted INR → USD. */
const IN_STOCKS: [string, string][] = [
  ["RELIANCE", "Reliance Industries"],
  ["TCS", "Tata Consultancy Services"],
  ["HDFCBANK", "HDFC Bank"],
  ["INFY", "Infosys"],
  ["ICICIBANK", "ICICI Bank"],
  ["SBIN", "State Bank of India"],
  ["BHARTIARTL", "Bharti Airtel"],
  ["ITC", "ITC Ltd"],
  ["LT", "Larsen & Toubro"],
  ["HINDUNILVR", "Hindustan Unilever"],
  ["KOTAKBANK", "Kotak Mahindra Bank"],
  ["AXISBANK", "Axis Bank"],
  ["MARUTI", "Maruti Suzuki"],
  ["TATAMOTORS", "Tata Motors"],
  ["SUNPHARMA", "Sun Pharma"],
  ["WIPRO", "Wipro"],
  ["ASIANPAINT", "Asian Paints"],
  ["BAJFINANCE", "Bajaj Finance"],
  ["ADANIENT", "Adani Enterprises"],
  ["TITAN", "Titan Company"],
];

/** Commodity futures (Yahoo "=F" symbols), quoted in USD. */
const COMMODITIES: [string, string, string][] = [
  ["GOLD", "Gold", "GC=F"],
  ["SILVER", "Silver", "SI=F"],
  ["CRUDEOIL", "Crude Oil (WTI)", "CL=F"],
  ["BRENT", "Brent Crude Oil", "BZ=F"],
  ["NATGAS", "Natural Gas", "NG=F"],
  ["COPPER", "Copper", "HG=F"],
  ["PLATINUM", "Platinum", "PL=F"],
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
  ...IN_STOCKS.map(([symbol, name]) => ({
    symbol,
    name,
    assetType: "IN_STOCK" as const,
    displaySymbol: `${symbol} · NSE`,
    providerSymbol: `${symbol}.NS`,
  })),
  ...COMMODITIES.map(([symbol, name, providerSymbol]) => ({
    symbol,
    name,
    assetType: "COMMODITY" as const,
    displaySymbol: `${symbol}/USD`,
    providerSymbol,
  })),
];

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  STOCK: "US Stock",
  CRYPTO: "Crypto",
  IN_STOCK: "Indian Stock (NSE)",
  COMMODITY: "Commodity",
};


export function catalogEntry(symbol: string): CatalogEntry | undefined {
  return CATALOG.find((a) => a.symbol === symbol.toUpperCase());
}
