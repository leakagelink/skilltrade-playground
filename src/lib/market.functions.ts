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

/** Batch quotes for the markets list / watchlists — one round-trip per poll tick. */
export const getQuotes = createServerFn({ method: "GET" })
  .inputValidator((data: { symbols?: string[] }) => ({
    symbols: (data?.symbols ?? []).map((s) => String(s).toUpperCase()).slice(0, 40),
  }))
  .handler(async ({ data }): Promise<{ quotes: Quote[] }> => {
    const { getMarketDataProvider } = await import("./market/provider.server");
    const provider = getMarketDataProvider();
    const symbols = data.symbols.length
      ? data.symbols
      : (await provider.getAssets()).map((a) => a.symbol);
    const settled = await Promise.allSettled(symbols.map((s) => provider.getLatestPrice(s)));
    return {
      quotes: settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
    };
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
