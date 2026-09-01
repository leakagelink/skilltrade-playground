import { mockMarketDataProvider } from "./mock-provider";
import type { MarketDataProvider } from "./types";

/**
 * Market data provider selection. Server-only: API keys must never reach the
 * client bundle. Configure MARKET_DATA_PROVIDER + MARKET_DATA_API_KEY as
 * server secrets to plug in a real provider later.
 */
export function getMarketDataProvider(): MarketDataProvider {
  const configured = (process.env["MARKET_DATA_PROVIDER"] ?? "mock").toLowerCase();
  const apiKey = process.env["MARKET_DATA_API_KEY"];

  if (configured !== "mock" && !apiKey) {
    // Real provider requested but not configured — fall back and stay honest
    // about the data status in the UI.
    return mockMarketDataProvider;
  }

  switch (configured) {
    // case "twelvedata": return createTwelveDataProvider(apiKey!)
    default:
      return mockMarketDataProvider;
  }
}

export function isRealProviderConfigured(): boolean {
  return getMarketDataProvider().id !== "mock";
}
