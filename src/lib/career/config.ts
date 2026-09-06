/**
 * Version 1.3 — Trading Career Mode configuration (client-safe).
 *
 * Everything here is declarative so progression rules live in ONE place and are
 * never hardcoded across the UI. Career Mode is educational simulation only:
 * rewards are XP, cosmetic titles and badges — never money or transferable value.
 */

export type CareerMetric =
  | "closedTrades"
  | "totalTrades"
  | "xp"
  | "skillScore"
  | "challengesCompleted"
  | "aiReviews"
  | "arenaCompleted"
  | "arenaWins"
  | "stopLossTrades"
  | "disciplinedTrades"
  | "distinctSymbols"
  | "activeDays"
  | "onboarding";

export interface CareerRequirement {
  label: string;
  metric: CareerMetric;
  target: number;
}

export interface CareerStage {
  key: string;
  name: string;
  description: string;
  title: string;
  requirements: CareerRequirement[];
  /** XP granted once, when the stage is first unlocked. */
  rewardXp: number;
}

/** Ordered career journey. Requirements are cumulative-friendly and configurable. */
export const CAREER_STAGES: CareerStage[] = [
  {
    key: "BEGINNER",
    name: "Beginner",
    description: "Learn the basics of simulated trading.",
    title: "Market Explorer",
    rewardXp: 0,
    requirements: [
      { label: "Complete onboarding", metric: "onboarding", target: 1 },
      { label: "Place your first simulated trade", metric: "totalTrades", target: 1 },
      { label: "Close one simulated trade", metric: "closedTrades", target: 1 },
    ],
  },
  {
    key: "APPRENTICE",
    name: "Apprentice",
    description: "Build a routine and learn simple risk habits.",
    title: "Practice Trader",
    rewardXp: 40,
    requirements: [
      { label: "Close 5 simulated trades", metric: "closedTrades", target: 5 },
      { label: "Complete 1 challenge", metric: "challengesCompleted", target: 1 },
      { label: "Earn 150 XP", metric: "xp", target: 150 },
    ],
  },
  {
    key: "TRADER",
    name: "Trader",
    description: "Practise planning trades with stop loss and take profit.",
    title: "Virtual Trader",
    rewardXp: 75,
    requirements: [
      { label: "Close 15 simulated trades", metric: "closedTrades", target: 15 },
      { label: "Reach a Trading Skill Score of 400", metric: "skillScore", target: 400 },
      { label: "Complete 3 challenges", metric: "challengesCompleted", target: 3 },
    ],
  },
  {
    key: "SKILLED_TRADER",
    name: "Skilled Trader",
    description: "Reflect on your simulated results and test them against AI opponents.",
    title: "Reflective Trader",
    rewardXp: 120,
    requirements: [
      { label: "Stay active on 5 different days", metric: "activeDays", target: 5 },
      { label: "Request 1 AI Coach review", metric: "aiReviews", target: 1 },
      { label: "Complete 1 AI Arena challenge", metric: "arenaCompleted", target: 1 },
    ],
  },
  {
    key: "EXPERT",
    name: "Expert",
    description: "Show consistent risk awareness across your simulation history.",
    title: "Strategy Explorer",
    rewardXp: 180,
    requirements: [
      { label: "Close 20 trades with stop loss and take profit", metric: "disciplinedTrades", target: 20 },
      { label: "Reach a Trading Skill Score of 600", metric: "skillScore", target: 600 },
      { label: "Complete 6 challenges", metric: "challengesCompleted", target: 6 },
    ],
  },
  {
    key: "MASTER",
    name: "Master",
    description: "Long-term consistency across every learning area of the simulator.",
    title: "Simulation Master",
    rewardXp: 250,
    requirements: [
      { label: "Stay active on 20 different days", metric: "activeDays", target: 20 },
      { label: "Win 2 AI Arena challenges", metric: "arenaWins", target: 2 },
      { label: "Request 5 AI Coach reviews", metric: "aiReviews", target: 5 },
    ],
  },
  {
    key: "LEGEND",
    name: "Legend",
    description: "A long-term simulation journey milestone.",
    title: "TradeVirt Legend",
    rewardXp: 400,
    requirements: [
      { label: "Reach a Trading Skill Score of 750", metric: "skillScore", target: 750 },
      { label: "Stay active on 45 different days", metric: "activeDays", target: 45 },
      { label: "Complete 15 challenges", metric: "challengesCompleted", target: 15 },
    ],
  },
];

export interface CareerMission {
  key: string;
  title: string;
  description: string;
  goal: string;
  metric: CareerMetric;
  target: number;
  rewardXp: number;
  /** Optional badge granted once when the mission completes. */
  badgeCode?: string;
}

export const CAREER_MISSIONS: CareerMission[] = [
  {
    key: "first_steps",
    title: "First Steps",
    description: "Complete your first simulated trade.",
    goal: "Understand how an order is placed and closed in the simulator.",
    metric: "closedTrades",
    target: 1,
    rewardXp: 25,
    badgeCode: "career_started",
  },
  {
    key: "risk_awareness",
    title: "Risk Awareness",
    description: "Complete a simulated trade using a stop loss.",
    goal: "Learn how a predefined exit limits a losing scenario.",
    metric: "stopLossTrades",
    target: 1,
    rewardXp: 30,
    badgeCode: "career_risk_aware",
  },
  {
    key: "portfolio_builder",
    title: "Portfolio Builder",
    description: "Trade 3 different simulated assets.",
    goal: "See how different markets behave instead of one symbol.",
    metric: "distinctSymbols",
    target: 3,
    rewardXp: 30,
  },
  {
    key: "discipline_check",
    title: "Discipline Check",
    description: "Request one AI Trading Coach review.",
    goal: "Reflect on a completed simulated trade with educational feedback.",
    metric: "aiReviews",
    target: 1,
    rewardXp: 35,
  },
  {
    key: "ai_challenger",
    title: "AI Challenger",
    description: "Complete one AI Arena challenge.",
    goal: "Compare your simulated decisions with rule-based AI opponents.",
    metric: "arenaCompleted",
    target: 1,
    rewardXp: 50,
  },
  {
    key: "consistency_builder",
    title: "Consistency Builder",
    description: "Stay active in the simulator on 5 different days.",
    goal: "Build a steady learning routine instead of trading excessively.",
    metric: "activeDays",
    target: 5,
    rewardXp: 40,
    badgeCode: "career_consistency",
  },
  {
    key: "planned_trades",
    title: "Planned Trades",
    description: "Close 5 trades that used both stop loss and take profit.",
    goal: "Practise planning an exit before entering a simulated position.",
    metric: "disciplinedTrades",
    target: 5,
    rewardXp: 45,
  },
  {
    key: "skill_growth",
    title: "Skill Growth",
    description: "Reach a Trading Skill Score of 500.",
    goal: "Improve overall simulated risk, consistency and reward quality.",
    metric: "skillScore",
    target: 500,
    rewardXp: 60,
  },
];

export interface CareerSpecialization {
  key: string;
  name: string;
  focus: string;
  description: string;
  /** Stage key required before this learning path can be selected. */
  unlockStage: string;
}

/** Educational learning paths — not certifications or qualifications. */
export const CAREER_SPECIALIZATIONS: CareerSpecialization[] = [
  {
    key: "STOCK_EXPLORER",
    name: "Stock Explorer",
    focus: "Stock market simulation",
    description: "Focus your simulation practice on stock symbols.",
    unlockStage: "APPRENTICE",
  },
  {
    key: "CRYPTO_EXPLORER",
    name: "Crypto Explorer",
    focus: "Cryptocurrency market simulation",
    description: "Focus your simulation practice on crypto symbols.",
    unlockStage: "APPRENTICE",
  },
  {
    key: "STRATEGY_EXPLORER",
    name: "Strategy Explorer",
    focus: "Trading strategy challenges",
    description: "Focus on challenges and planned entries and exits.",
    unlockStage: "TRADER",
  },
  {
    key: "AI_CHALLENGER",
    name: "AI Challenger",
    focus: "AI Arena challenges",
    description: "Focus on comparing your practice against rule-based opponents.",
    unlockStage: "SKILLED_TRADER",
  },
];

export function stageIndex(key: string): number {
  const i = CAREER_STAGES.findIndex((s) => s.key === key);
  return i < 0 ? 0 : i;
}

export function careerMission(key: string): CareerMission | undefined {
  return CAREER_MISSIONS.find((m) => m.key === key);
}
