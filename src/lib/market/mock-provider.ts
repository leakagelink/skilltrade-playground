import type { Candle, MarketAsset, MarketDataProvider, Quote, Timeframe } from "./types";
import { TIMEFRAMES } from "./types";

/**
 * DEVELOPMENT / FALLBACK PROVIDER.
 * Generates deterministic simulated market data so the app is fully functional
 * before a real market data API is configured. Never presented as live data.
 */

const CATALOG: (MarketAsset & { base: number; vol: number })[] = [
  { symbol: "AAPL", name: "Apple Inc.", assetType: "STOCK", displaySymbol: "AAPL/USD", base: 228, vol: 0.012 },
  { symbol: "MSFT", name: "Microsoft", assetType: "STOCK", displaySymbol: "MSFT/USD", base: 415, vol: 0.011 },
  { symbol: "NVDA", name: "NVIDIA", assetType: "STOCK", displaySymbol: "NVDA/USD", base: 132, vol: 0.021 },
  { symbol: "TSLA", name: "Tesla", assetType: "STOCK", displaySymbol: "TSLA/USD", base: 246, vol: 0.026 },
  { symbol: "AMZN", name: "Amazon", assetType: "STOCK", displaySymbol: "AMZN/USD", base: 186, vol: 0.014 },
  { symbol: "BTC", name: "Bitcoin", assetType: "CRYPTO", displaySymbol: "BTC/USD", base: 67200, vol: 0.018 },
  { symbol: "ETH", name: "Ethereum", assetType: "CRYPTO", displaySymbol: "ETH/USD", base: 3150, vol: 0.022 },
  { symbol: "SOL", name: "Solana", assetType: "CRYPTO", displaySymbol: "SOL/USD", base: 168, vol: 0.031 },
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic pseudo-random in [-1, 1] for a symbol + bucket index. */
function noise(symbol: string, index: number, salt = 0): number {
  const h = hash(`${symbol}:${index}:${salt}`);
  return (h % 20001) / 10000 - 1;
}

function meta(symbol: string) {
  const s = symbol.toUpperCase();
  return (
    CATALOG.find((a) => a.symbol === s) ?? {
      symbol: s,
      name: s,
      assetType: "STOCK" as const,
      displaySymbol: `${s}/USD`,
      base: 20 + (hash(s) % 400),
      vol: 0.015,
    }
  );
}


function bucketSeconds(timeframe: Timeframe): number {
  return TIMEFRAMES.find((t) => t.value === timeframe)?.seconds ?? 60;
}

function closeAt(symbol: string, bucket: number, vol: number, base: number): number {
  // Layered deterministic random walk: slow drift + medium waves + local noise.
  const drift = Math.sin(bucket / 500 + hash(symbol) % 100) * base * vol * 12;
  const wave = Math.sin(bucket / 47 + (hash(symbol) % 31)) * base * vol * 4;
  const local = noise(symbol, bucket) * base * vol;
  const price = base + drift + wave + local;
  return Math.max(price, base * 0.15);
}

function buildCandle(symbol: string, bucket: number, step: number, vol: number, base: number): Candle {
  const open = closeAt(symbol, bucket - 1, vol, base);
  const close = closeAt(symbol, bucket, vol, base);
  const spread = Math.abs(noise(symbol, bucket, 7)) * base * vol * 0.9;
  const high = Math.max(open, close) + spread;
  const low = Math.max(Math.min(open, close) - spread, 0.01);
  const volume = Math.round((1 + Math.abs(noise(symbol, bucket, 3))) * 10000);
  return {
    time: bucket * step,
    open: round(open),
    high: round(high),
    low: round(low),
    close: round(close),
    volume,
  };
}

function round(n: number): number {
  return n >= 1000 ? Math.round(n * 100) / 100 : Math.round(n * 10000) / 10000;
}

export const mockMarketDataProvider: MarketDataProvider = {
  id: "mock",

  async getAssets() {
    return CATALOG.map(({ symbol, name, assetType, displaySymbol }) => ({
      symbol,
      name,
      assetType,
      displaySymbol,
    }));
  },

  async getLatestPrice(symbol) {
    const m = meta(symbol);
    if (!m) throw new Error("UNSUPPORTED_ASSET");
    // Keep fallback quotes visibly moving while still deterministic. This is
    // only used when the real upstream feed is unavailable.
    const step = 5;
    const bucket = Math.floor(Date.now() / 1000 / step);
    const price = round(closeAt(m.symbol, bucket, m.vol, m.base));
    const dayAgo = round(closeAt(m.symbol, bucket - 1440, m.vol, m.base));
    return {
      symbol: m.symbol,
      price,
      changePercent: Math.round(((price - dayAgo) / dayAgo) * 10000) / 100,
      status: "SIMULATED",
      asOf: Date.now(),
    } satisfies Quote;
  },

  async getOHLC(symbol, timeframe, limit = 200) {
    const m = meta(symbol);
    if (!m) throw new Error("UNSUPPORTED_ASSET");
    const step = bucketSeconds(timeframe);
    const last = Math.floor(Date.now() / 1000 / step);
    const out: Candle[] = [];
    for (let i = limit - 1; i >= 0; i--) {
      out.push(buildCandle(m.symbol, last - i, step, m.vol, m.base));
    }
    return out;
  },

  async getHistoricalData(symbol, timeframe, from, to) {
    const m = meta(symbol);
    if (!m) throw new Error("UNSUPPORTED_ASSET");
    const step = bucketSeconds(timeframe);
    const out: Candle[] = [];
    for (let b = Math.floor(from / step); b <= Math.floor(to / step); b++) {
      out.push(buildCandle(m.symbol, b, step, m.vol, m.base));
    }
    return out;
  },
};
