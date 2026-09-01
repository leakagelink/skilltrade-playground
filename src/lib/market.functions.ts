import { createServerFn } from "@tanstack/react-start";
import type { Candle, MarketAsset, Quote, Timeframe } from "./market/types";

const TF: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

function parseTf(v: unknown): Timeframe {
  return TF.includes(v as Timeframe) ? (v as Timeframe) : "1h";
}

export const getMarketAssets = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ assets: MarketAsset[] }> => {
    const { getMarketDataProvider } = await import("./market/provider.server");
    return { assets: await getMarketDataProvider().getAssets() };
  },
);

export const getQuote = createServerFn({ method: "GET" })
  .inputValidator((data: { symbol: string }) => ({ symbol: String(data.symbol).toUpperCase() }))
  .handler(async ({ data }): Promise<Quote> => {
    const { getMarketDataProvider } = await import("./market/provider.server");
    return getMarketDataProvider().getLatestPrice(data.symbol);
  });

export const getCandles = createServerFn({ method: "GET" })
  .inputValidator((data: { symbol: string; timeframe: string }) => ({
    symbol: String(data.symbol).toUpperCase(),
    timeframe: parseTf(data.timeframe),
  }))
  .handler(
    async ({
      data,
    }): Promise<{ candles: Candle[]; quote: Quote; dataStatus: Quote["status"] }> => {
      const { getMarketDataProvider } = await import("./market/provider.server");
      const provider = getMarketDataProvider();
      const [candles, quote] = await Promise.all([
        provider.getOHLC(data.symbol, data.timeframe, 200),
        provider.getLatestPrice(data.symbol),
      ]);
      return { candles, quote, dataStatus: quote.status };
    },
  );
