/**
 * Version 1.4 Social Competition configuration (client-safe).
 *
 * TradeVirt competitions are simulated trading contests played with virtual
 * funds only. There are no entry fees, deposits, withdrawals, wagers or cash
 * prizes, and every reward (XP, badges, profile recognition) is virtual,
 * non-transferable and has no monetary value.
 */

export type CompetitionKind = "FRIEND" | "PUBLIC" | "TOURNAMENT";
export type CompetitionStatus =
  | "DRAFT"
  | "WAITING_FOR_OPPONENT"
  | "ACTIVE"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED";
export type MarketCategory = "ALL" | "STOCK" | "CRYPTO";

/** Configurable presets offered when creating a friend challenge. */
export const DURATION_PRESETS = [1, 3, 7] as const;
export const BALANCE_PRESETS = [10000, 50000, 100000] as const;
export const MARKET_CATEGORIES: { value: MarketCategory; label: string }[] = [
  { value: "ALL", label: "Stocks & Crypto" },
  { value: "STOCK", label: "Stocks only" },
  { value: "CRYPTO", label: "Crypto only" },
];

export const TOURNAMENT_DEFAULTS = {
  title: "TradeVirt Weekly Challenge",
  durationDays: 7,
  startingBalance: 100000,
  marketCategory: "ALL" as MarketCategory,
};

export const PUBLIC_CHALLENGE_DEFAULTS = {
  title: "Open 3-Day Simulation Challenge",
  durationDays: 3,
  startingBalance: 100000,
  marketCategory: "ALL" as MarketCategory,
};

/**
 * Simulation Competition Score weights.
 *
 * Score = return 40% + risk management 25% + drawdown control 20% +
 * consistency 15%. It is deterministic, always calculated on the server, and
 * deliberately not "highest profit wins" so reckless simulated trading is not
 * rewarded. It is a game score, not a measure of real trading ability.
 */
export const COMPETITION_SCORE_WEIGHTS = {
  return: 0.4,
  risk: 0.25,
  drawdown: 0.2,
  consistency: 0.15,
};

export const COMPETITION_XP = {
  JOIN: 15,
  COMPLETE: 60,
  WIN: 120,
  TOP_10: 80,
};

/** Optional, user-selected country list. No location permission is ever requested. */
export const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Singapore",
  "United Arab Emirates",
  "Japan",
  "Brazil",
  "Nigeria",
  "South Africa",
  "Other",
] as const;

export const COMPETITION_DISCLOSURES = [
  "TradeVirt competitions use simulated trading and virtual funds only.",
  "No real money, deposits, entry fees, or cash prizes are involved.",
  "Virtual rewards have no monetary value and cannot be exchanged or redeemed.",
];

export function statusLabel(status: string): string {
  switch (status) {
    case "WAITING_FOR_OPPONENT":
      return "Waiting for opponent";
    case "ACTIVE":
      return "Live";
    case "COMPLETED":
      return "Completed";
    case "EXPIRED":
      return "Expired";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Draft";
  }
}
