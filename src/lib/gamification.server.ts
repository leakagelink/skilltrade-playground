/** XP / level progression and Trading Skill Score. Server-side only. */

export const LEVEL_TITLES = [
  "Beginner",
  "Learner",
  "Trader",
  "Skilled Trader",
  "Advanced Trader",
  "Expert Trader",
  "Master Trader",
  "Elite Trader",
];

/** Total XP required to reach a given level (scalable, mildly super-linear). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level - 1, 1.6));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp && level < 200) level++;
  return level;
}

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1] ?? "Legendary Trader";
}

export const XP_REWARDS = {
  OPEN_TRADE: 5,
  CLOSE_TRADE: 10,
  DISCIPLINED_TRADE: 15,
  PROFITABLE_DISCIPLINED_TRADE: 10,
  DAILY_REWARD: 10,
  CHALLENGE_COMPLETE: 50,
};

export interface TradeForScoring {
  direction: "BUY" | "SELL";
  entry_price: number;
  exit_price: number | null;
  position_size: number;
  stop_loss: number | null;
  take_profit: number | null;
  realized_pnl: number | null;
  status: string;
}

export interface SkillBreakdown {
  riskManagement: number;
  consistency: number;
  riskReward: number;
  drawdownControl: number;
  winRate: number;
  profitability: number;
  activityQuality: number;
  score: number;
}

const WEIGHTS = {
  riskManagement: 0.25,
  consistency: 0.2,
  riskReward: 0.15,
  drawdownControl: 0.15,
  winRate: 0.1,
  profitability: 0.1,
  activityQuality: 0.05,
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Transparent, modular Trading Skill Score (0–1000).
 * Deliberately NOT profit-only: risk discipline dominates the weighting.
 */
export function calculateTradingSkillScore(
  trades: TradeForScoring[],
  startingBalance = 100000,
): SkillBreakdown {
  const closed = trades.filter((t) => t.status !== "OPEN" && t.exit_price != null);

  if (closed.length === 0) {
    return {
      riskManagement: 0,
      consistency: 0,
      riskReward: 0,
      drawdownControl: 0,
      winRate: 0,
      profitability: 0,
      activityQuality: 0,
      score: 0,
    };
  }

  // --- Risk management: stop-loss usage + risk per trade kept small
  const withStop = closed.filter((t) => t.stop_loss != null).length / closed.length;
  const riskPerTrade = closed.map((t) => {
    if (t.stop_loss == null) return 0.1; // treated as high risk
    const riskFraction = Math.abs(t.entry_price - t.stop_loss) / t.entry_price;
    return (riskFraction * t.position_size) / startingBalance;
  });
  const avgRisk = riskPerTrade.reduce((a, b) => a + b, 0) / riskPerTrade.length;
  const riskSizing = clamp01(1 - avgRisk / 0.05); // 5% risk per trade => 0
  const riskManagement = clamp01(withStop * 0.5 + riskSizing * 0.5);

  // --- Consistency: low variance of returns relative to average magnitude
  const returns = closed.map((t) => (t.realized_pnl ?? 0) / Math.max(t.position_size, 1));
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const std = Math.sqrt(variance);
  const consistency = clamp01(1 - std / 0.15);

  // --- Risk/reward quality: planned RR from SL/TP
  const rrs = closed
    .filter((t) => t.stop_loss != null && t.take_profit != null)
    .map((t) => {
      const risk = Math.abs(t.entry_price - (t.stop_loss as number));
      const reward = Math.abs((t.take_profit as number) - t.entry_price);
      return risk > 0 ? reward / risk : 0;
    });
  const avgRR = rrs.length ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;
  const rrCoverage = rrs.length / closed.length;
  const riskReward = clamp01((avgRR / 2) * 0.7 + rrCoverage * 0.3);

  // --- Drawdown control on the simulated equity curve
  let equity = startingBalance;
  let peak = startingBalance;
  let maxDd = 0;
  for (const t of closed) {
    equity += t.realized_pnl ?? 0;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, (peak - equity) / peak);
  }
  const drawdownControl = clamp01(1 - maxDd / 0.25); // 25% drawdown => 0

  // --- Win rate (capped contribution, 60% is full marks)
  const wins = closed.filter((t) => (t.realized_pnl ?? 0) > 0).length;
  const winRateRaw = wins / closed.length;
  const winRate = clamp01(winRateRaw / 0.6);

  // --- Profitability (net return, 20% gain is full marks)
  const net = closed.reduce((a, t) => a + (t.realized_pnl ?? 0), 0);
  const profitability = clamp01(net / (startingBalance * 0.2));

  // --- Activity quality: enough trades to be meaningful, without over-trading
  const n = closed.length;
  const activityQuality = n <= 30 ? clamp01(n / 20) : clamp01(1 - (n - 30) / 200);

  const parts = {
    riskManagement,
    consistency,
    riskReward,
    drawdownControl,
    winRate,
    profitability,
    activityQuality,
  };

  const weighted = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).reduce(
    (sum, key) => sum + parts[key] * WEIGHTS[key],
    0,
  );

  // Confidence ramp: a single lucky trade should not produce a top score.
  const confidence = clamp01(0.4 + n / 20);

  return {
    ...Object.fromEntries(
      Object.entries(parts).map(([k, v]) => [k, Math.round(v * 100)]),
    ) as unknown as Omit<SkillBreakdown, "score">,
    score: Math.round(weighted * confidence * 1000),
  };
}

export function maxDrawdown(closed: TradeForScoring[], startingBalance = 100000): number {
  let equity = startingBalance;
  let peak = startingBalance;
  let maxDd = 0;
  for (const t of closed) {
    equity += t.realized_pnl ?? 0;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, (peak - equity) / peak);
  }
  return Math.round(maxDd * 10000) / 100;
}
