import { liveMarketDataProvider } from "./live-provider.server";
import type { MarketDataProvider } from "./types";

/**
 * Market data provider selection. Server-only.
 *
 * Real data only: Yahoo Finance for stocks, Coinbase for crypto. There is no
 * simulator fallback — if an upstream source is unreachable the error
 * propagates so the app never prices a real economy off fake data.
 */
export function getMarketDataProvider(): MarketDataProvider {
  return liveMarketDataProvider;
}

export function isRealProviderConfigured(): boolean {
  return true;
}
