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

export async function generateTradeReview(input: CoachInput): Promise<CoachReview> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiUnavailableError();

  let res: Response;
  try {
    res = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(input) },
        ],
        response_format: { type: "json_object" },
      }),
    });
  } catch {
    throw new AiUnavailableError();
  }

  if (!res.ok) throw new AiUnavailableError();

  let parsed: Record<string, unknown>;
  try {
    const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const json = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new AiUnavailableError();
  }

  const review: CoachReview = {
    risk_management_score: num(parsed["risk_management_score"]),
    discipline_score: num(parsed["discipline_score"]),
    timing_score: num(parsed["timing_score"]),
    consistency_score: num(parsed["consistency_score"]),
    summary: typeof parsed["summary"] === "string" ? parsed["summary"].slice(0, 600) : "",
    strengths: strings(parsed["strengths"]),
    areas_to_review: strings(parsed["areas_to_review"]),
    detected_patterns: strings(parsed["detected_patterns"]),
    educational_note: typeof parsed["educational_note"] === "string" ? parsed["educational_note"].slice(0, 400) : "",
  };

  if (!review.summary || !isSafe(review)) throw new AiUnavailableError();
  return review;
}
