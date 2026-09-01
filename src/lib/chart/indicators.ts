import type { Candle } from "@/lib/market/types";

export type IndicatorId = "sma" | "ema" | "rsi" | "macd" | "bb" | "vwap";

export interface IndicatorConfig {
  id: IndicatorId;
  enabled: boolean;
  period: number;
  color: string;
}

export const INDICATOR_META: Record<
  IndicatorId,
  { label: string; description: string; pane: "main" | "sub"; defaultPeriod: number; token: string }
> = {
  sma: { label: "SMA", description: "Simple moving average", pane: "main", defaultPeriod: 20, token: "--accent" },
  ema: { label: "EMA", description: "Exponential moving average", pane: "main", defaultPeriod: 50, token: "--primary" },
  bb: { label: "Bollinger Bands", description: "SMA ± 2 standard deviations", pane: "main", defaultPeriod: 20, token: "--muted-foreground" },
  vwap: { label: "VWAP", description: "Volume weighted average price", pane: "main", defaultPeriod: 0, token: "--bear" },
  rsi: { label: "RSI", description: "Relative strength index (0–100)", pane: "sub", defaultPeriod: 14, token: "--accent" },
  macd: { label: "MACD", description: "12/26/9 momentum oscillator", pane: "sub", defaultPeriod: 12, token: "--primary" },
};

export interface Point {
  time: number;
  value: number;
}

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = [];
  let prev: number | null = null;
  let seed = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (i < period - 1) {
      seed += v;
      out.push(null);
      continue;
    }
    if (prev === null) {
      seed += v;
      prev = seed / period;
    } else {
      prev = v * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

export function rsi(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [null];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < values.length; i++) {
    const diff = values[i]! - values[i - 1]!;
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);
    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      out.push(i === period ? 100 - 100 / (1 + avgGain / (avgLoss || 1e-9)) : null);
      continue;
    }
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out.push(100 - 100 / (1 + avgGain / (avgLoss || 1e-9)));
  }
  return out;
}

export function macd(values: number[]) {
  const fast = ema(values, 12);
  const slow = ema(values, 26);
  const line = values.map((_, i) =>
    fast[i] !== null && slow[i] !== null ? fast[i]! - slow[i]! : null,
  );
  const defined = line.map((v) => v ?? 0);
  const sig = ema(defined, 9).map((v, i) => (line[i] === null ? null : v));
  const hist = line.map((v, i) => (v !== null && sig[i] !== null ? v - sig[i]! : null));
  return { line, signal: sig, hist };
}

export function bollinger(values: number[], period: number, mult = 2) {
  const mid = sma(values, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    const m = mid[i];
    if (m === null || m === undefined) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (values[j]! - m) ** 2;
    const sd = Math.sqrt(variance / period);
    upper.push(m + mult * sd);
    lower.push(m - mult * sd);
  }
  return { mid, upper, lower };
}

export function vwap(candles: Candle[]): (number | null)[] {
  let pv = 0;
  let vol = 0;
  return candles.map((c) => {
    const typical = (c.high + c.low + c.close) / 3;
    pv += typical * c.volume;
    vol += c.volume;
    return vol > 0 ? pv / vol : null;
  });
}

export function toPoints(candles: Candle[], series: (number | null)[]): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < candles.length; i++) {
    const v = series[i];
    if (v !== null && v !== undefined && Number.isFinite(v)) out.push({ time: candles[i]!.time, value: v });
  }
  return out;
}
