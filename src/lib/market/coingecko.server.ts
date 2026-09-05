/**
 * CoinGecko crypto quotes with automatic API-key rotation.
 *
 * Up to 4 keys (COINGECKO_API_KEY_1..4) are used round-robin. When a key hits
 * its rate/credit limit (HTTP 429 / 401 / 403) it is put in cooldown and the
 * next available key takes over automatically. If every key is exhausted the
 * caller falls back to the keyless public data source.
 */

type KeyState = { key: string; cooldownUntil: number; failures: number };

let keyStates: KeyState[] | null = null;
let cursor = 0;

function loadKeys(): KeyState[] {
  if (keyStates) return keyStates;
  const raw = [
    process.env["COINGECKO_API_KEY_1"],
    process.env["COINGECKO_API_KEY_2"],
    process.env["COINGECKO_API_KEY_3"],
    process.env["COINGECKO_API_KEY_4"],
  ].filter((k): k is string => Boolean(k && k.trim()));
  keyStates = raw.map((key) => ({ key: key.trim(), cooldownUntil: 0, failures: 0 }));
  return keyStates;
}

export function hasCoinGeckoKeys(): boolean {
  return loadKeys().length > 0;
}

/** Demo keys (CG-...) use the public host; Pro keys use the pro host. */
function endpoint(key: string, path: string, params: URLSearchParams): { url: string; header: string } {
  const isDemo = key.startsWith("CG-");
  const host = isDemo ? "https://api.coingecko.com/api/v3" : "https://pro-api.coingecko.com/api/v3";
  const header = isDemo ? "x-cg-demo-api-key" : "x-cg-pro-api-key";
  return { url: `${host}${path}?${params.toString()}`, header };
}

/** Rate-limit cooldown grows with repeated failures, capped at 10 minutes. */
function cooldownMs(failures: number): number {
  return Math.min(60_000 * Math.max(1, failures), 600_000);
}

async function requestWithRotation(path: string, params: URLSearchParams): Promise<unknown> {
  const keys = loadKeys();
  if (keys.length === 0) throw new Error("No CoinGecko API keys configured");

  const now = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const state = keys[(cursor + attempt) % keys.length]!;
    if (state.cooldownUntil > now) continue;

    const { url, header } = endpoint(state.key, path, params);
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json", [header]: state.key },
      });

      if (res.status === 429 || res.status === 401 || res.status === 403) {
        state.failures += 1;
        state.cooldownUntil = Date.now() + cooldownMs(state.failures);
        cursor = (cursor + attempt + 1) % keys.length;
        lastError = new Error(`CoinGecko key limit reached [${res.status}]`);
        continue;
      }

      if (!res.ok) {
        lastError = new Error(`CoinGecko request failed [${res.status}]`);
        continue;
      }

      state.failures = 0;
      // Keep using this key until it fails, then move on.
      cursor = (cursor + attempt) % keys.length;
      return await res.json();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error("All CoinGecko API keys are rate limited");
}

/** Base ticker → CoinGecko coin id. */
const COIN_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  DOT: "polkadot",
  LTC: "litecoin",
  MATIC: "matic-network",
  ATOM: "cosmos",
  UNI: "uniswap",
  AAVE: "aave",
  BCH: "bitcoin-cash",
};

export function coinGeckoId(symbol: string): string | undefined {
  return COIN_IDS[symbol.toUpperCase()];
}

export type CoinGeckoQuote = { price: number; changePercent: number; asOf: number };

export async function coinGeckoSimplePrice(symbol: string): Promise<CoinGeckoQuote> {
  const id = coinGeckoId(symbol);
  if (!id) throw new Error(`No CoinGecko id for ${symbol}`);

  const params = new URLSearchParams({
    ids: id,
    vs_currencies: "usd",
    include_24hr_change: "true",
    include_last_updated_at: "true",
  });

  const payload = (await requestWithRotation("/simple/price", params)) as Record<
    string,
    { usd?: number; usd_24h_change?: number; last_updated_at?: number } | undefined
  >;

  const row = payload[id];
  if (!row || typeof row.usd !== "number") throw new Error(`No CoinGecko price for ${symbol}`);

  return {
    price: row.usd,
    changePercent: row.usd_24h_change ?? 0,
    asOf: row.last_updated_at ?? Math.floor(Date.now() / 1000),
  };
}

/** Fetches the whole crypto watchlist in one request to preserve API credits. */
export async function coinGeckoSimplePrices(symbols: string[]): Promise<Map<string, CoinGeckoQuote>> {
  const pairs = symbols.flatMap((symbol) => {
    const id = coinGeckoId(symbol);
    return id ? [{ symbol: symbol.toUpperCase(), id }] : [];
  });
  if (pairs.length === 0) return new Map();

  const params = new URLSearchParams({
    ids: pairs.map(({ id }) => id).join(","),
    vs_currencies: "usd",
    include_24hr_change: "true",
    include_last_updated_at: "true",
  });
  const payload = (await requestWithRotation("/simple/price", params)) as Record<
    string,
    { usd?: number; usd_24h_change?: number; last_updated_at?: number } | undefined
  >;
  const quotes = new Map<string, CoinGeckoQuote>();
  for (const { symbol, id } of pairs) {
    const row = payload[id];
    if (!row || typeof row.usd !== "number") continue;
    quotes.set(symbol, {
      price: row.usd,
      changePercent: row.usd_24h_change ?? 0,
      asOf: row.last_updated_at ?? Math.floor(Date.now() / 1000),
    });
  }
  return quotes;
}
