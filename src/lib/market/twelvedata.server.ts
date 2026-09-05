/**
 * Twelve Data stock quotes/candles with automatic API-key rotation.
 *
 * Up to 9 keys (TWELVEDATA_API_KEY_1..9) are used round-robin. When a key hits
 * its rate/credit limit (HTTP 429 / 401 / 403, or a Twelve Data error body with
 * code 429/401/403) it is put in cooldown and the next available key takes over
 * automatically. If every key is exhausted the caller falls back to Yahoo.
 */

import type { Candle, Timeframe } from "./types";

type KeyState = { key: string; cooldownUntil: number; failures: number };

let keyStates: KeyState[] | null = null;
let cursor = 0;

function loadKeys(): KeyState[] {
  if (keyStates) return keyStates;
  const raw = [
    process.env["TWELVEDATA_API_KEY_1"],
    process.env["TWELVEDATA_API_KEY_2"],
    process.env["TWELVEDATA_API_KEY_3"],
    process.env["TWELVEDATA_API_KEY_4"],
    process.env["TWELVEDATA_API_KEY_5"],
    process.env["TWELVEDATA_API_KEY_6"],
    process.env["TWELVEDATA_API_KEY_7"],
    process.env["TWELVEDATA_API_KEY_8"],
    process.env["TWELVEDATA_API_KEY_9"],
  ].filter((k): k is string => Boolean(k && k.trim()));
  keyStates = raw.map((key) => ({ key: key.trim(), cooldownUntil: 0, failures: 0 }));
  return keyStates;
}

export function hasTwelveDataKeys(): boolean {
  return loadKeys().length > 0;
}

/** Rate-limit cooldown grows with repeated failures, capped at 10 minutes. */
function cooldownMs(failures: number): number {
  return Math.min(60_000 * Math.max(1, failures), 600_000);
}

function isLimitCode(code: unknown): boolean {
  return code === 429 || code === 401 || code === 403;
}

async function requestWithRotation(path: string, params: URLSearchParams): Promise<Record<string, unknown>> {
  const keys = loadKeys();
  if (keys.length === 0) throw new Error("No Twelve Data API keys configured");

  const now = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const index = (cursor + attempt) % keys.length;
    const state = keys[index]!;
    if (state.cooldownUntil > now) continue;

    const url = `https://api.twelvedata.com${path}?${params.toString()}&apikey=${encodeURIComponent(state.key)}`;
    try {
      const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });

      if (res.status === 429 || res.status === 401 || res.status === 403) {
        state.failures += 1;
        state.cooldownUntil = Date.now() + cooldownMs(state.failures);
        cursor = (index + 1) % keys.length;
        lastError = new Error(`Twelve Data key limit reached [${res.status}]`);
        continue;
      }

      if (!res.ok) {
        lastError = new Error(`Twelve Data request failed [${res.status}]`);
        continue;
      }

      const payload = (await res.json()) as Record<string, unknown>;

      // Twelve Data returns 200 with an error envelope for limit/auth problems.
      if (payload["status"] === "error" || typeof payload["code"] === "number") {
        const code = payload["code"];
        if (isLimitCode(code)) {
          state.failures += 1;
          state.cooldownUntil = Date.now() + cooldownMs(state.failures);
          cursor = (index + 1) % keys.length;
          lastError = new Error(`Twelve Data key limit reached [${String(code)}]`);
          continue;
        }
        if (payload["status"] === "error") {
          throw new Error(String(payload["message"] ?? "Twelve Data error"));
        }
      }

      state.failures = 0;
      cursor = index; // keep using this key until it fails
      return payload;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error("All Twelve Data API keys are rate limited");
}

export type TwelveDataQuote = {
  price: number;
  changePercent: number;
  asOf: number;
  marketOpen: boolean;
};

function parseMarketOpen(value: unknown): boolean {
  return value === true || value === 1 || value === "true" || value === "1";
}

function parseQuote(payload: Record<string, unknown>, symbol: string): TwelveDataQuote | undefined {
  const price = Number(payload["close"] ?? payload["price"]);
  if (!Number.isFinite(price) || price <= 0) return undefined;
  const percent = Number(payload["percent_change"]);
  const timestamp = Number(payload["timestamp"]);
  return {
    price,
    changePercent: Number.isFinite(percent) ? percent : 0,
    asOf: Number.isFinite(timestamp) ? timestamp : Math.floor(Date.now() / 1000),
    marketOpen: parseMarketOpen(payload["is_market_open"]),
  };
}

export async function twelveDataQuote(symbol: string): Promise<TwelveDataQuote> {
  const payload = await requestWithRotation("/quote", new URLSearchParams({ symbol }));
  const quote = parseQuote(payload, symbol);
  if (!quote) throw new Error(`No Twelve Data price for ${symbol}`);
  return quote;
}

/** Fetches many stock quotes with one API call instead of one credit burst per symbol. */
export async function twelveDataQuotes(symbols: string[]): Promise<Map<string, TwelveDataQuote>> {
  if (symbols.length === 0) return new Map();
  const normalized = symbols.map((symbol) => symbol.toUpperCase());
  const payload = await requestWithRotation(
    "/quote",
    new URLSearchParams({ symbol: normalized.join(",") }),
  );
  const quotes = new Map<string, TwelveDataQuote>();

  // Twelve Data returns a direct quote for one symbol and a symbol-keyed map
  // for a multi-symbol request.
  if (normalized.length === 1) {
    const symbol = normalized[0];
    if (!symbol) return quotes;
    const quote = parseQuote(payload, symbol);
    if (quote) quotes.set(symbol, quote);
    return quotes;
  }
  for (const symbol of normalized) {
    const row = payload[symbol];
    if (!row || typeof row !== "object") continue;
    const quote = parseQuote(row as Record<string, unknown>, symbol);
    if (quote) quotes.set(symbol, quote);
  }
  return quotes;
}

const INTERVALS: Record<Timeframe, string> = {
  "1m": "1min",
  "5m": "5min",
  "15m": "15min",
  "1h": "1h",
  "4h": "4h",
  "1d": "1day",
};

export async function twelveDataCandles(symbol: string, timeframe: Timeframe, limit = 500): Promise<Candle[]> {
  const payload = await requestWithRotation(
    "/time_series",
    new URLSearchParams({
      symbol,
      interval: INTERVALS[timeframe],
      outputsize: String(Math.min(Math.max(limit, 50), 5000)),
      timezone: "UTC",
      order: "ASC",
    }),
  );

  const values = payload["values"];
  if (!Array.isArray(values)) throw new Error(`No Twelve Data candles for ${symbol}`);

  const candles: Candle[] = [];
  for (const raw of values as Record<string, string>[]) {
    const time = Math.floor(new Date(`${raw["datetime"]!.replace(" ", "T")}Z`).getTime() / 1000);
    const open = Number(raw["open"]);
    const high = Number(raw["high"]);
    const low = Number(raw["low"]);
    const close = Number(raw["close"]);
    if (!Number.isFinite(time) || !Number.isFinite(open) || !Number.isFinite(close)) continue;
    candles.push({ time, open, high, low, close, volume: Number(raw["volume"] ?? 0) || 0 });
  }

  if (candles.length === 0) throw new Error(`No Twelve Data candles for ${symbol}`);
  candles.sort((a, b) => a.time - b.time);
  return candles;
}
