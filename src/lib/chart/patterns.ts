import type { Candle } from "@/lib/market/types";

export interface PatternHit {
  time: number;
  label: string;
  bias: "bull" | "bear" | "neutral";
}

const body = (c: Candle) => Math.abs(c.close - c.open);
const range = (c: Candle) => Math.max(c.high - c.low, 1e-9);
const upperWick = (c: Candle) => c.high - Math.max(c.open, c.close);
const lowerWick = (c: Candle) => Math.min(c.open, c.close) - c.low;
const bull = (c: Candle) => c.close > c.open;

/** Rule-based candlestick pattern detection used for educational labels on the chart. */
export function detectPatterns(candles: Candle[]): PatternHit[] {
  const hits: PatternHit[] = [];
  for (let i = 2; i < candles.length; i++) {
    const c = candles[i]!;
    const p = candles[i - 1]!;
    const p2 = candles[i - 2]!;

    if (body(c) / range(c) < 0.01) {
      hits.push({ time: c.time, label: "Doji", bias: "neutral" });
      continue;
    }
    if (lowerWick(c) > body(c) * 2 && upperWick(c) < body(c)) {
      hits.push({ time: c.time, label: "Hammer", bias: "bull" });
      continue;
    }
    if (upperWick(c) > body(c) * 2 && lowerWick(c) < body(c)) {
      hits.push({ time: c.time, label: "Inv. Hammer", bias: "bear" });
      continue;
    }
    if (bull(c) && !bull(p) && c.close >= p.open && c.open <= p.close) {
      hits.push({ time: c.time, label: "Bullish Engulfing", bias: "bull" });
      continue;
    }
    if (!bull(c) && bull(p) && c.open >= p.close && c.close <= p.open) {
      hits.push({ time: c.time, label: "Bearish Engulfing", bias: "bear" });
      continue;
    }
    if (!bull(p2) && body(p) / range(p) < 0.3 && bull(c) && c.close > (p2.open + p2.close) / 2) {
      hits.push({ time: c.time, label: "Morning Star", bias: "bull" });
      continue;
    }
    if (bull(p2) && body(p) / range(p) < 0.3 && !bull(c) && c.close < (p2.open + p2.close) / 2) {
      hits.push({ time: c.time, label: "Evening Star", bias: "bear" });
      continue;
    }
    if (bull(c) && bull(p) && bull(p2) && c.close > p.close && p.close > p2.close) {
      hits.push({ time: c.time, label: "Three White Soldiers", bias: "bull" });
      continue;
    }
    if (!bull(c) && !bull(p) && !bull(p2) && c.close < p.close && p.close < p2.close) {
      hits.push({ time: c.time, label: "Three Black Crows", bias: "bear" });
    }
  }
  // Keep the chart readable: only the most recent hits are labelled.
  return hits.slice(-12);
}
