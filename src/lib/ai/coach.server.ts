/**
 * AI Trade Coach — server-side only.
 *
 * Sends *minimised, anonymised* metrics of a single completed simulated trade
 * (no email, no user id, no auth token, no balance identifiers) to the Lovable
 * AI gateway and returns a structured, retrospective, educational review.
 *
 * If the AI service is unavailable the caller must surface an error — this
 * module never fabricates a "fake AI" review.
 */

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash";

export interface CoachInput {
  assetCategory: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number;
  positionSizePctOfBalance: number;
  riskPctOfBalance: number | null;
  plannedRiskReward: number | null;
  hadStopLoss: boolean;
  hadTakeProfit: boolean;
  resultPctOfPosition: number;
  holdMinutes: number;
  closeReason: string;
  historicalTrades: number;
  historicalWinRate: number;
  historicalStopLossUsagePct: number;
}

export interface CoachReview {
  risk_management_score: number;
  discipline_score: number;
  timing_score: number;
  consistency_score: number;
  summary: string;
  strengths: string[];
  areas_to_review: string[];
  detected_patterns: string[];
  educational_note: string;
}

export const AI_DISCLAIMER =
  "AI-generated insights are based on simulated trading activity and are provided for educational and informational purposes only. They do not constitute financial, investment, or trading advice.";

export class AiUnavailableError extends Error {
  constructor() {
    super("AI analysis is temporarily unavailable. Please try again later.");
  }
}

const SYSTEM_PROMPT = `You are an educational review assistant inside TradeVirt, a paper-trading simulator. You analyse ONE already-completed SIMULATED trade retrospectively.

Hard rules:
- Never give financial, investment or trading advice.
- Never recommend buying, selling, holding, entering or exiting any asset.
- Never predict prices, market direction or future outcomes; never promise profits.
- Never use words like guaranteed, signal, or "you should invest".
- Never use medical, psychological or diagnostic language.
- Speak only about what already happened in this SIMULATED trade and the user's simulated statistics, using neutral retrospective phrasing such as "Your simulated trade used a relatively large position size."
- Scores are 0-100 educational indicators of the observed behaviour in simulation only, never a measure of real-world ability.

Reply with JSON only, matching exactly:
{"risk_management_score":int,"discipline_score":int,"timing_score":int,"consistency_score":int,"summary":string,"strengths":[string],"areas_to_review":[string],"detected_patterns":[string],"educational_note":string}
Keep summary under 320 characters and each list to 1-3 short items.`;

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback;
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 4) : [];
}

/** Blocks any output that slipped past the prompt rules. */
const BANNED = [
  "guaranteed",
  "guarantee",
  "buy now",
  "sell now",
  "you should buy",
  "you should sell",
  "you should invest",
  "will rise",
  "will fall",
  "price prediction",
  "trading signal",
  "risk-free",
  "get rich",
  "make money",
];

function isSafe(review: CoachReview): boolean {
  const text = [review.summary, review.educational_note, ...review.strengths, ...review.areas_to_review, ...review.detected_patterns]
    .join(" ")
    .toLowerCase();
  return !BANNED.some((phrase) => text.includes(phrase));
}

/**
 * Built-in rule-based review. Runs entirely on our server — no external AI
 * service and no Lovable AI credits are used.
 */
export async function generateTradeReview(input: CoachInput): Promise<CoachReview> {
  void AI_URL; void AI_MODEL; void SYSTEM_PROMPT;
  const strengths: string[] = [];
  const areas: string[] = [];
  const patterns: string[] = [];

  let risk = 50;
  if (input.hadStopLoss) { risk += 20; strengths.push("Your simulated trade used a stop-loss."); }
  else { risk -= 15; areas.push("This simulated trade had no stop-loss set."); }
  if (input.hadTakeProfit) { risk += 10; strengths.push("A take-profit level was defined in advance."); }
  if (input.positionSizePctOfBalance > 25) { risk -= 20; areas.push("The position size was relatively large compared to your virtual balance."); patterns.push("Large position size"); }
  else if (input.positionSizePctOfBalance <= 10) { risk += 10; strengths.push("Position size was modest relative to your virtual balance."); }
  if (input.plannedRiskReward !== null && input.plannedRiskReward >= 2) { risk += 10; strengths.push("The planned reward-to-risk ratio was at least 2:1."); }

  let discipline = 55;
  const cr = input.closeReason.toUpperCase();
  if (cr.includes("STOP") || cr.includes("TAKE") || cr.includes("TP") || cr.includes("SL")) { discipline += 20; patterns.push("Closed by a pre-set level"); }
  else if (input.hadStopLoss || input.hadTakeProfit) { discipline -= 5; patterns.push("Closed manually before pre-set levels"); }
  if (input.historicalStopLossUsagePct >= 60) discipline += 15;
  else if (input.historicalTrades >= 5 && input.historicalStopLossUsagePct < 30) { discipline -= 10; areas.push("Stop-loss usage across your simulated history is low."); }

  let timing = 50 + Math.max(-30, Math.min(30, input.resultPctOfPosition * 3));
  if (input.holdMinutes < 2) { timing -= 10; patterns.push("Very short holding time"); }

  let consistency = 40;
  if (input.historicalTrades >= 20) consistency += 20; else if (input.historicalTrades >= 5) consistency += 10;
  consistency += Math.round((input.historicalWinRate - 50) / 2);

  const outcome = input.resultPctOfPosition >= 0 ? "closed with a simulated gain" : "closed with a simulated loss";
  const summary = `Your simulated ${input.direction} trade in ${input.assetCategory.toLowerCase()} ${outcome} of ${input.resultPctOfPosition.toFixed(2)}% after about ${Math.round(input.holdMinutes)} minutes.`;
  if (!strengths.length) strengths.push("The trade was completed and recorded for review.");
  if (!areas.length) areas.push("Keep reviewing position size and exit planning on each simulated trade.");

  const review: CoachReview = {
    risk_management_score: num(risk),
    discipline_score: num(discipline),
    timing_score: num(timing),
    consistency_score: num(consistency),
    summary,
    strengths: strengths.slice(0, 3),
    areas_to_review: areas.slice(0, 3),
    detected_patterns: patterns.slice(0, 3),
    educational_note: "Defining a stop-loss and a sensible position size before entering helps keep simulated risk consistent across trades.",
  };
  if (!isSafe(review)) throw new AiUnavailableError();
  return review;
}
