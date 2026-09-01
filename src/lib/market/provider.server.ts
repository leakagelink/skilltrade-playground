import { liveMarketDataProvider } from "./live-provider.server";
import { mockMarketDataProvider } from "./mock-provider";
import type { Candle, MarketAsset, MarketDataProvider, Quote, Timeframe } from "./types";

/**
 * Market data provider selection. Server-only.
 *
 * Default: free live data (Yahoo Finance for stocks, Coinbase for crypto) with
 * an automatic fallback to the deterministic simulator when an upstream source
 * is unreachable, so the app never breaks. Set MARKET_DATA_PROVIDER=mock to
 * force simulated data.
 */
const resilientProvider: MarketDataProvider = {
  id: "free-live",

  async getAssets(): Promise<MarketAsset[]> {
    return liveMarketDataProvider.getAssets();
  },

  async getLatestPrice(symbol: string): Promise<Quote> {
    try {
      return await liveMarketDataProvider.getLatestPrice(symbol);
    } catch (error) {
      console.error(`[market] live quote failed for ${symbol}, using simulator:`, error);
      return mockMarketDataProvider.getLatestPrice(symbol);
    }
  },

  async getOHLC(symbol: string, timeframe: Timeframe, limit?: number): Promise<Candle[]> {
    try {
      return await liveMarketDataProvider.getOHLC(symbol, timeframe, limit);
    } catch (error) {
      console.error(`[market] live candles failed for ${symbol}, using simulator:`, error);
      return mockMarketDataProvider.getOHLC(symbol, timeframe, limit);
    }
  },

  async getHistoricalData(symbol: string, timeframe: Timeframe, from: number, to: number): Promise<Candle[]> {
    try {
      return await liveMarketDataProvider.getHistoricalData(symbol, timeframe, from, to);
    } catch (error) {
      console.error(`[market] live history failed for ${symbol}, using simulator:`, error);
      return mockMarketDataProvider.getHistoricalData(symbol, timeframe, from, to);
    }
  },
};

export function getMarketDataProvider(): MarketDataProvider {
  const configured = (process.env["MARKET_DATA_PROVIDER"] ?? "live").toLowerCase();
  return configured === "mock" ? mockMarketDataProvider : resilientProvider;
}

export function isRealProviderConfigured(): boolean {
  return getMarketDataProvider().id !== "mock";
}
