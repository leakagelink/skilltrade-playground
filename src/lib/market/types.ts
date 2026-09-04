export type AssetType = "STOCK" | "CRYPTO";

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export const TIMEFRAMES: { value: Timeframe; label: string; seconds: number }[] = [
  { value: "1m", label: "1M", seconds: 60 },
  { value: "5m", label: "5M", seconds: 300 },
  { value: "15m", label: "15M", seconds: 900 },
  { value: "1h", label: "1H", seconds: 3600 },
  { value: "4h", label: "4H", seconds: 14400 },
  { value: "1d", label: "1D", seconds: 86400 },
];

export interface MarketAsset {
  symbol: string;
  name: string;
  assetType: AssetType;
  displaySymbol: string;
}

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  symbol: string;
  price: number;
  changePercent: number;
  /** "LIVE" only when a real provider is configured, otherwise data is simulated or delayed. */
  status: "SIMULATED" | "DELAYED" | "LIVE";
  asOf: number;
  marketState?: "OPEN" | "CLOSED" | "PRE" | "POST";
}

export interface MarketDataProvider {
  readonly id: string;
  getAssets(): Promise<MarketAsset[]>;
  getLatestPrice(symbol: string): Promise<Quote>;
  getOHLC(symbol: string, timeframe: Timeframe, limit?: number): Promise<Candle[]>;
  getHistoricalData(symbol: string, timeframe: Timeframe, from: number, to: number): Promise<Candle[]>;
}
