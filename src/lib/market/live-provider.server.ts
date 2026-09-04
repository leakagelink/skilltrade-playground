import { CATALOG, catalogEntry } from "./catalog";
import type { Candle, MarketAsset, MarketDataProvider, Quote, Timeframe } from "./types";
import { TIMEFRAMES } from "./types";

/**
 * FREE LIVE MARKET DATA PROVIDER (no API key required).
 * - Stocks : Yahoo Finance public chart endpoint (15-min delayed quotes)
 * - Crypto : Coinbase Exchange public market data (real-time)
 * Requests are cached in-memory to stay well inside the free rate limits.
 */

const UA = "Mozilla/5.0 (compatible; TradeVirt/1.0; educational paper trading)";

/* --------------------- stale-while-revalidate cache --------------------- */

const cache = new Map<string, { at: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

/**
 * Serves cached data instantly. Fresh (< ttl) → cache hit.
 * Stale but usable (< ttl * 2) → cache returned immediately while a single
 * background refresh runs. Identical concurrent loads are de-duplicated.
 */
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < ttlMs) return hit.value as T;

  const refresh = (): Promise<T> => {
    const existing = inflight.get(key);
    if (existing) return existing as Promise<T>;
    const p = load()
      .then((value) => {
        cache.set(key, { at: Date.now(), value });
        if (cache.size > 400) {
          const cutoff = Date.now() - 10 * 60_000;
          for (const [k, v] of cache) if (v.at < cutoff) cache.delete(k);
        }
        return value;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  };

  // Stale-but-recent: return instantly, revalidate in the background.
  if (hit && now - hit.at < ttlMs * 2) {
    void refresh().catch(() => undefined);
    return hit.value as T;
  }

  try {
    return await refresh();
  } catch (err) {
    if (hit) return hit.value as T;
    throw err;
  }
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": UA, Accept: "application/json", "Cache-Control": "no-cache" },
  });
  if (!res.ok) throw new Error(`Market data request failed [${res.status}]: ${await res.text()}`);
  return res.json();
}


/* ---------------------------- helpers ---------------------------- */

function bucketSeconds(tf: Timeframe): number {
  return TIMEFRAMES.find((t) => t.value === tf)?.seconds ?? 3600;
}

/** Aggregate finer candles into a coarser timeframe (used for 4h, which no free source serves). */
function aggregate(candles: Candle[], seconds: number): Candle[] {
  const out: Candle[] = [];
  for (const c of candles) {
    const bucket = Math.floor(c.time / seconds) * seconds;
    const last = out[out.length - 1];
    if (last && last.time === bucket) {
      last.high = Math.max(last.high, c.high);
      last.low = Math.min(last.low, c.low);
      last.close = c.close;
      last.volume += c.volume;
    } else {
      out.push({ ...c, time: bucket });
    }
  }
  return out;
}

/* ------------------------------- stocks -------------------------------- */

const YAHOO_INTERVAL: Record<Timeframe, { interval: string; range: string }> = {
  "1m": { interval: "1m", range: "1d" },
  "5m": { interval: "5m", range: "5d" },
  "15m": { interval: "15m", range: "1mo" },
  "1h": { interval: "1h", range: "3mo" },
  "4h": { interval: "1h", range: "6mo" },
  "1d": { interval: "1d", range: "2y" },
};

interface YahooChart {
  chart?: {
    result?: {
      meta?: {
        regularMarketPrice?: number;
        regularMarketChangePercent?: number;
        regularMarketTime?: number;
        previousClose?: number;
        chartPreviousClose?: number;
        marketState?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: {
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }[];
      };
    }[];
    error?: { description?: string } | null;
  };
}

async function yahooChart(symbol: string, tf: Timeframe): Promise<YahooChart> {
  const cfg = YAHOO_INTERVAL[tf];
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=${cfg.interval}&range=${cfg.range}&includePrePost=true`;
    return cached(`y:${symbol}:${tf}`, tf === "1d" ? 8_000 : 30_000, () => getJson(url) as Promise<YahooChart>);
}

/** Latest quote uses its own short-lived key so candle caching cannot freeze ticks. */
async function yahooLatest(symbol: string): Promise<YahooChart> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1m&range=1d&includePrePost=true&_=${Math.floor(Date.now() / 900)}`;
  return cached(`yq:${symbol}`, 900, () => getJson(url) as Promise<YahooChart>);
}

function yahooToCandles(payload: YahooChart): Candle[] {
  const result = payload.chart?.result?.[0];
  const times = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  const candles: Candle[] = [];
  for (let i = 0; i < times.length; i++) {
    const o = q?.open?.[i];
    const h = q?.high?.[i];
    const l = q?.low?.[i];
    const c = q?.close?.[i];
    if (o == null || h == null || l == null || c == null) continue;
    candles.push({ time: times[i]!, open: o, high: h, low: l, close: c, volume: q?.volume?.[i] ?? 0 });
  }
  return candles;
}

/* ------------------------------- crypto -------------------------------- */

const COINBASE_GRANULARITY: Record<Timeframe, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 3600,
  "1d": 86400,
};

async function coinbaseCandles(product: string, tf: Timeframe): Promise<Candle[]> {
  const granularity = COINBASE_GRANULARITY[tf];
  const url = `https://api.exchange.coinbase.com/products/${product}/candles?granularity=${granularity}`;
  const rows = await cached(`cb:${product}:${tf}`, 45_000, () => getJson(url) as Promise<number[][]>);
  const candles = rows
    .map((r) => ({
      time: r[0]!,
      low: r[1]!,
      high: r[2]!,
      open: r[3]!,
      close: r[4]!,
      volume: r[5] ?? 0,
    }))
    .sort((a, b) => a.time - b.time);
  return tf === "4h" ? aggregate(candles, 14400) : candles;
}

async function coinbaseStats(product: string): Promise<{ last: number; open: number; time: string | undefined }> {
  const [ticker, stats] = await Promise.all([
    cached(`cbt:${product}`, 500, () =>
      getJson(`https://api.exchange.coinbase.com/products/${product}/ticker`) as Promise<{ price?: string; time?: string }>,
    ),
    cached(`cbs:${product}`, 30_000, () =>
      getJson(`https://api.exchange.coinbase.com/products/${product}/stats`) as Promise<{ last?: string; open?: string }>,
    ),
  ]);
  return { last: Number(ticker.price ?? stats.last ?? 0), open: Number(stats.open ?? 0), time: ticker.time };
}

/* ------------------------------ provider ------------------------------- */

export const liveMarketDataProvider: MarketDataProvider = {
  id: "free-live",

  async getAssets(): Promise<MarketAsset[]> {
    return CATALOG.map(({ symbol, name, assetType, displaySymbol }) => ({
      symbol,
      name,
      assetType,
      displaySymbol,
    }));
  },

  async getLatestPrice(symbol: string): Promise<Quote> {
    const entry = catalogEntry(symbol);
    if (!entry) throw new Error(`Unknown symbol ${symbol}`);

    if (entry.assetType === "CRYPTO") {
      const { last, open, time } = await coinbaseStats(entry.providerSymbol);
      return {
        symbol: entry.symbol,
        price: last,
        changePercent: open > 0 ? ((last - open) / open) * 100 : 0,
        status: "LIVE",
        asOf: time ? Math.floor(new Date(time).getTime() / 1000) : Math.floor(Date.now() / 1000),
        marketState: "OPEN",
      };
    }

    const payload = await yahooLatest(entry.providerSymbol);
    const meta = payload.chart?.result?.[0]?.meta;
    const closes = payload.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const latestClose = [...closes].reverse().find((value) => value != null);
    // regularMarketPrice is the fastest Yahoo tick. A 1-minute candle close
    // changes only once per minute and previously made stocks look frozen.
    const price = meta?.regularMarketPrice ?? latestClose;
    const previousClose = meta?.previousClose ?? meta?.chartPreviousClose;
    if (price == null) throw new Error(`No quote for ${symbol}`);
    return {
      symbol: entry.symbol,
      price,
      changePercent:
        meta?.regularMarketChangePercent ??
        (previousClose && previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0),
      status: "DELAYED",
      asOf: meta?.regularMarketTime ?? Math.floor(Date.now() / 1000),
      marketState:
        meta?.marketState === "REGULAR"
          ? "OPEN"
          : meta?.marketState === "PRE"
            ? "PRE"
            : meta?.marketState === "POST" || meta?.marketState === "POSTPOST"
              ? "POST"
              : "CLOSED",
    };
  },

  async getOHLC(symbol: string, timeframe: Timeframe, limit = 200): Promise<Candle[]> {
    const entry = catalogEntry(symbol);
    if (!entry) throw new Error(`Unknown symbol ${symbol}`);

    let candles: Candle[];
    if (entry.assetType === "CRYPTO") {
      candles = await coinbaseCandles(entry.providerSymbol, timeframe);
    } else {
      const payload = await yahooChart(entry.providerSymbol, timeframe);
      candles = yahooToCandles(payload);
      if (timeframe === "4h") candles = aggregate(candles, bucketSeconds("4h"));
    }
    if (candles.length === 0) throw new Error(`No candles for ${symbol}`);
    return candles.slice(-limit);
  },

  async getHistoricalData(symbol: string, timeframe: Timeframe, from: number, to: number): Promise<Candle[]> {
    const candles = await this.getOHLC(symbol, timeframe, 1000);
    return candles.filter((c) => c.time >= from && c.time <= to);
  },
};
