/**
 * Rule-based Arena opponent strategies (server-only).
 *
 * Every decision is deterministic and derived from real market candles — no
 * random profits, no invented prices, no LLM calls. Strategies are modular so
 * new ones can be added without touching the Arena engine.
 */
import type { Candle } from "../market/types";
import type { ArenaBot, ArenaStrategyKind } from "./bots";

export interface StrategySignal {
  direction: "BUY" | "SELL";
  /** Higher is a stronger rule match; used to pick one asset per decision. */
  strength: number;
}

export interface ArenaBotStrategy {
  readonly kind: ArenaStrategyKind;
  evaluateMarket(history: Candle[]): StrategySignal | null;
}

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i]!;
  return sum / period;
}

function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i]! - values[i - 1]!;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  if (gain + loss === 0) return 50;
  const rs = gain / Math.max(loss, 1e-9);
  return 100 - 100 / (1 + rs);
}

function ret(values: number[], lookback: number): number | null {
  if (values.length <= lookback) return null;
  const past = values[values.length - 1 - lookback]!;
  if (past <= 0) return null;
  return (values[values.length - 1]! - past) / past;
}

const conservative: ArenaBotStrategy = {
  kind: "CONSERVATIVE",
  evaluateMarket(history) {
    const closes = history.map((c) => c.close);
    const fast = sma(closes, 20);
    const slow = sma(closes, 50);
    const last = closes[closes.length - 1];
    if (fast == null || slow == null || last == null) return null;
    // Long only, in an established uptrend, entering on a mild pullback.
    if (fast > slow * 1.002 && last <= fast * 1.005) {
      return { direction: "BUY", strength: (fast - slow) / slow };
    }
    return null;
  },
};

const momentum: ArenaBotStrategy = {
  kind: "MOMENTUM",
  evaluateMarket(history) {
    const closes = history.map((c) => c.close);
    const r = ret(closes, 6);
    const fast = sma(closes, 10);
    const slow = sma(closes, 30);
    if (r == null || fast == null || slow == null) return null;
    if (r > 0.008 && fast > slow) return { direction: "BUY", strength: r };
    if (r < -0.008 && fast < slow) return { direction: "SELL", strength: -r };
    return null;
  },
};

const quant: ArenaBotStrategy = {
  kind: "QUANT",
  evaluateMarket(history) {
    const closes = history.map((c) => c.close);
    const value = rsi(closes, 14);
    const mean = sma(closes, 30);
    const last = closes[closes.length - 1];
    if (value == null || mean == null || last == null) return null;
    if (value < 35 && last < mean) return { direction: "BUY", strength: (35 - value) / 35 };
    if (value > 65 && last > mean) return { direction: "SELL", strength: (value - 65) / 35 };
    return null;
  },
};

const aggressive: ArenaBotStrategy = {
  kind: "AGGRESSIVE",
  evaluateMarket(history) {
    const closes = history.map((c) => c.close);
    const r = ret(closes, 3);
    if (r == null) return null;
    if (r > 0.003) return { direction: "BUY", strength: r };
    if (r < -0.003) return { direction: "SELL", strength: -r };
    return null;
  },
};

const REGISTRY: Record<ArenaStrategyKind, ArenaBotStrategy> = {
  CONSERVATIVE: conservative,
  MOMENTUM: momentum,
  QUANT: quant,
  AGGRESSIVE: aggressive,
};

export function strategyFor(bot: ArenaBot): ArenaBotStrategy {
  return REGISTRY[bot.strategy];
}
