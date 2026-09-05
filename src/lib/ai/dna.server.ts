/**
 * Trader DNA — server-side, deterministic calculation from verified simulated
 * trades. Never trusts frontend-supplied values.
 *
 * Everything here is an educational, gamified summary of *simulated* trading
 * behaviour. It is not a financial assessment and not a psychological
 * evaluation, and the wording deliberately avoids advice or diagnosis.
 */

export interface DnaTrade {
  direction: "BUY" | "SELL";
  entry_price: number;
  exit_price: number | null;
  position_size: number;
  stop_loss: number | null;
  take_profit: number | null;
  realized_pnl: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
}

export type ActivityLevel = "LOW" | "MODERATE" | "HIGHER";

export const PERSONALITIES = [
  "Conservative Explorer",
  "Momentum Explorer",
  "Active Trader",
  "Patient Trader",
  "Balanced Trader",
  "Strategy Explorer",
] as const;

export type Personality = (typeof PERSONALITIES)[number];

export interface TraderDna {
  riskControl: number;
  discipline: number;
  consistency: number;
  patience: number;
  positionSizeManagement: number;
  activityLevel: ActivityLevel;
  personality: Personality;
  sampleSize: number;
  hasEnoughData: boolean;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const pct = (n: number) => Math.round(clamp01(n) * 100);

function closedTrades(trades: DnaTrade[]): DnaTrade[] {
  return trades.filter((t) => t.status !== "OPEN" && t.exit_price != null);
}

function holdMinutes(t: DnaTrade): number {
  if (!t.closed_at) return 0;
  return Math.max(0, (new Date(t.closed_at).getTime() - new Date(t.opened_at).getTime()) / 60000);
}

export function calculateTraderDna(trades: DnaTrade[], startingBalance = 100000): TraderDna {
  const closed = closedTrades(trades);
  const n = closed.length;

  if (n === 0) {
    return {
      riskControl: 0,
      discipline: 0,
      consistency: 0,
      patience: 0,
      positionSizeManagement: 0,
      activityLevel: "LOW",
      personality: "Strategy Explorer",
      sampleSize: 0,
      hasEnoughData: false,
    };
  }

  // Risk control — stop-loss coverage plus how small the risk per trade was.
  const withStop = closed.filter((t) => t.stop_loss != null).length / n;
  const riskFractions = closed.map((t) => {
    if (t.stop_loss == null) return 0.1;
    return (Math.abs(t.entry_price - t.stop_loss) / t.entry_price) * (t.position_size / startingBalance);
  });
  const avgRisk = riskFractions.reduce((a, b) => a + b, 0) / n;
  const riskControl = pct(withStop * 0.5 + clamp01(1 - avgRisk / 0.05) * 0.5);

  // Discipline — pre-planned exits and letting those plans run.
  const planned = closed.filter((t) => t.stop_loss != null && t.take_profit != null).length / n;
  const planRespected = closed.filter((t) => t.status === "STOP_LOSS_HIT" || t.status === "TAKE_PROFIT_HIT").length / n;
  const discipline = pct(planned * 0.65 + planRespected * 0.35);

  // Consistency — how tightly clustered the simulated returns are.
  const returns = closed.map((t) => (t.realized_pnl ?? 0) / Math.max(t.position_size, 1));
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const consistency = pct(1 - std / 0.15);

  // Patience — typical holding time (4 hours or longer scores full marks).
  const holds = closed.map(holdMinutes).filter((m) => m > 0);
  const avgHold = holds.length ? holds.reduce((a, b) => a + b, 0) / holds.length : 0;
  const patience = pct(avgHold / 240);

  // Position size management — smaller share of the virtual balance per trade.
  const avgSize = closed.reduce((a, t) => a + t.position_size, 0) / n / startingBalance;
  const positionSizeManagement = pct(1 - Math.max(0, avgSize - 0.05) / 0.3);

  // Activity level — trades per week over the observed window.
  const times = trades.map((t) => new Date(t.opened_at).getTime());
  const spanDays = times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 86_400_000 : 1;
  const perWeek = trades.length / Math.max(spanDays, 1) * 7;
  const activityLevel: ActivityLevel = perWeek >= 25 ? "HIGHER" : perWeek >= 7 ? "MODERATE" : "LOW";

  const hasEnoughData = n >= 3;
  let personality: Personality = "Strategy Explorer";
  if (hasEnoughData) {
    if (activityLevel === "HIGHER") personality = "Active Trader";
    else if (riskControl >= 70 && positionSizeManagement >= 70 && activityLevel === "LOW")
      personality = "Conservative Explorer";
    else if (patience >= 70) personality = "Patient Trader";
    else if (discipline >= 65 && consistency >= 65) personality = "Balanced Trader";
    else personality = "Momentum Explorer";
  }

  return {
    riskControl,
    discipline,
    consistency,
    patience,
    positionSizeManagement,
    activityLevel,
    personality,
    sampleSize: n,
    hasEnoughData,
  };
}

export interface PeriodStats {
  trades: number;
  winRate: number;
  consistency: number;
  riskControl: number;
  discipline: number;
  avgGain: number;
  avgLoss: number;
}

function periodStats(trades: DnaTrade[]): PeriodStats {
  const closed = closedTrades(trades);
  if (closed.length === 0) {
    return { trades: 0, winRate: 0, consistency: 0, riskControl: 0, discipline: 0, avgGain: 0, avgLoss: 0 };
  }
  const dna = calculateTraderDna(closed);
  const wins = closed.filter((t) => (t.realized_pnl ?? 0) > 0);
  const losses = closed.filter((t) => (t.realized_pnl ?? 0) <= 0);
  const avg = (rows: DnaTrade[]) =>
    rows.length ? Math.round((rows.reduce((a, t) => a + (t.realized_pnl ?? 0), 0) / rows.length) * 100) / 100 : 0;
  return {
    trades: closed.length,
    winRate: Math.round((wins.length / closed.length) * 1000) / 10,
    consistency: dna.consistency,
    riskControl: dna.riskControl,
    discipline: dna.discipline,
    avgGain: avg(wins),
    avgLoss: avg(losses),
  };
}

export interface PerformanceComparison {
  hasEnoughData: boolean;
  current: PeriodStats;
  previous: PeriodStats;
}

/** Compares the last 7 days of simulated activity with the 7 days before it. */
export function comparePerformance(trades: DnaTrade[], now = Date.now()): PerformanceComparison {
  const day = 86_400_000;
  const inWindow = (t: DnaTrade, fromAgo: number, toAgo: number) => {
    const at = new Date(t.closed_at ?? t.opened_at).getTime();
    return at > now - fromAgo * day && at <= now - toAgo * day;
  };
  const current = closedTrades(trades).filter((t) => inWindow(t, 7, 0));
  const previous = closedTrades(trades).filter((t) => inWindow(t, 14, 7));
  return {
    hasEnoughData: current.length >= 2 && previous.length >= 2,
    current: periodStats(current),
    previous: periodStats(previous),
  };
}
