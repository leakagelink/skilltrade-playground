import type { BasePlanId, Tier } from "./plans";

/** All advertised additions are executed through the server-gated practice workbench. */
export const PLAN_DETAILS = {
  basic: {
    label: "PLAN BEFORE YOU TRADE",
    headline: "Turn a trade idea into a risk plan",
    audience: "For learners building a position-sizing and exit-planning habit.",
    reason: "Enter your virtual capital, entry, stop and target. Basic calculates whole-unit position size, planned loss, target gain and reward-to-risk before you practice.",
    highlights: ["Position & risk planner — repeat calculations without credits", "Risk-budget-based whole-unit sizing", "Stop-loss and target-gain calculations", "Reward-to-risk ratio and capital required", "All existing Free practice tools remain included"],
    limitation: "Ads remain enabled. Personal discipline reports require Pro; losing-streak stress tests require Elite.",
    action: "Choose Basic",
  },
  pro: {
    label: "REVIEW & IMPROVE",
    headline: "Find the gaps in your discipline",
    audience: "For regular learners who want a personal review loop and ad-free practice.",
    reason: "Pro adds a rule-based report on your latest 500 closed trades, highlighting missing stops and targets, realized R and a next-session checklist. Download your report to keep your own review record.",
    highlights: ["Everything in Basic's risk planner", "Ad-free across TradeVirt", "Personal discipline report from your own trades", "Recorded stop / target coverage and average realized R", "Focused next-session review checklist", "Download your discipline report as CSV"],
    limitation: "Losing-streak stress tests and drawdown-recovery scenarios require Elite. No extra virtual funds or AI credits.",
    action: "Choose Pro",
  },
  elite: {
    label: "TEST YOUR RESILIENCE",
    headline: "Prepare for a losing streak",
    audience: "For committed learners exploring how risk sizing affects capital and recovery.",
    reason: "Elite adds hypothetical losing-streak scenarios. Compare fixed starting-capital risk with resized remaining-capital risk, then inspect drawdown and the gain needed to recover before trying a new risk setting.",
    highlights: ["Everything in Pro, including ad-free practice", "Losing-streak stress lab: 1–50 hypothetical losses", "Compare fixed versus resized risk budgets", "Projected scenario ending balances", "Drawdown and recovery-gain calculations", "Repeat scenarios with different risk percentages"],
    limitation: "Scenarios are mathematical what-if exercises, not market replay, historical backtests, predictions or guaranteed results.",
    action: "Choose Elite",
  },
} satisfies Record<Exclude<Tier, "free">, { label: string; headline: string; audience: string; reason: string; highlights: string[]; limitation: string; action: string }>;

export const BILLING_DETAILS: Record<BasePlanId, { title: string; description: string; renewal: string }> = {
  monthly: { title: "Monthly · a shorter commitment", description: "Pay for one month at a time. Your selected plan's benefits stay the same; the subscription renews every month unless cancelled.", renewal: "One-month billing period" },
  yearly: { title: "Yearly · one annual payment", description: "Pay the full yearly price upfront for a year of your selected plan. The subscription renews annually unless cancelled. Yearly does not unlock extra features.", renewal: "Full year paid upfront" },
};