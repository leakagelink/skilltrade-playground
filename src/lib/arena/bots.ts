/**
 * AI Arena opponent configuration (client-safe).
 *
 * Arena opponents are NOT autonomous intelligent traders. Each opponent runs a
 * fixed, rule-based simulation strategy over the same market data the user
 * sees. Nothing here predicts markets or guarantees any outcome.
 */

export type ArenaDifficulty = "EASY" | "MEDIUM" | "HARD" | "EXPERT";
export type ArenaRiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type ArenaStrategyKind = "CONSERVATIVE" | "MOMENTUM" | "QUANT" | "AGGRESSIVE";

export interface ArenaBot {
  id: string;
  name: string;
  style: string;
  description: string;
  riskLevel: ArenaRiskLevel;
  difficulty: ArenaDifficulty;
  strategy: ArenaStrategyKind;
  badgeCode: string;
  /** Simulation profile shown in the UI — clearly labelled as simulated behaviour. */
  profile: { positionSize: string; stopLoss: string; takeProfit: string; maxOpen: number };
  config: {
    maxOpen: number;
    /** Position size as a share of the arena starting capital. */
    sizePct: number;
    stopLossPct: number;
    takeProfitPct: number;
    /** Hours the strategy waits between opening new simulated positions. */
    cooldownHours: number;
    allowShort: boolean;
  };
}

/** Assets the Arena opponents may trade — a subset of the TradeVirt catalog. */
export const ARENA_UNIVERSE = ["AAPL", "MSFT", "NVDA", "TSLA", "BTC", "ETH", "SOL", "LINK"];

/** Configurable Arena defaults. */
export const ARENA_STARTING_CAPITAL = 100000;
export const ARENA_DURATION_DAYS = 7;

/** Server-side Arena Score weights (kept in one place so they stay configurable). */
export const ARENA_SCORE_WEIGHTS = { return: 0.4, risk: 0.25, drawdown: 0.2, consistency: 0.15 };

export const ARENA_BOTS: ArenaBot[] = [
  {
    id: "alpha",
    name: "ALPHA",
    style: "Conservative Trader",
    description: "Focuses on controlled risk and stable simulated trading decisions.",
    riskLevel: "LOW",
    difficulty: "EASY",
    strategy: "CONSERVATIVE",
    badgeCode: "alpha_breaker",
    profile: { positionSize: "5% of capital", stopLoss: "2%", takeProfit: "3%", maxOpen: 2 },
    config: { maxOpen: 2, sizePct: 0.05, stopLossPct: 0.02, takeProfitPct: 0.03, cooldownHours: 12, allowShort: false },
  },
  {
    id: "nova",
    name: "NOVA",
    style: "Momentum Trader",
    description: "Follows recent market trends with momentum-based simulated trades.",
    riskLevel: "MEDIUM",
    difficulty: "MEDIUM",
    strategy: "MOMENTUM",
    badgeCode: "nova_breaker",
    profile: { positionSize: "10% of capital", stopLoss: "3%", takeProfit: "5%", maxOpen: 3 },
    config: { maxOpen: 3, sizePct: 0.1, stopLossPct: 0.03, takeProfitPct: 0.05, cooldownHours: 6, allowShort: true },
  },
  {
    id: "quant",
    name: "QUANT",
    style: "Data-Driven Trader",
    description: "Uses predefined quantitative simulation rules on recent price data.",
    riskLevel: "MEDIUM",
    difficulty: "HARD",
    strategy: "QUANT",
    badgeCode: "quant_breaker",
    profile: { positionSize: "8% of capital", stopLoss: "2.5%", takeProfit: "4%", maxOpen: 3 },
    config: { maxOpen: 3, sizePct: 0.08, stopLossPct: 0.025, takeProfitPct: 0.04, cooldownHours: 4, allowShort: true },
  },
  {
    id: "titan",
    name: "TITAN",
    style: "Aggressive Trader",
    description: "Uses higher-risk simulated trading strategies with larger positions.",
    riskLevel: "HIGH",
    difficulty: "EXPERT",
    strategy: "AGGRESSIVE",
    badgeCode: "titan_breaker",
    profile: { positionSize: "18% of capital", stopLoss: "5%", takeProfit: "9%", maxOpen: 4 },
    config: { maxOpen: 4, sizePct: 0.18, stopLossPct: 0.05, takeProfitPct: 0.09, cooldownHours: 3, allowShort: true },
  },
];

export function arenaBot(id: string): ArenaBot | undefined {
  return ARENA_BOTS.find((b) => b.id === id);
}

/** XP granted server-side when an Arena completes. */
export const ARENA_XP = {
  COMPLETE: 60,
  WIN: { EASY: 40, MEDIUM: 70, HARD: 110, EXPERT: 160 } as Record<ArenaDifficulty, number>,
};
