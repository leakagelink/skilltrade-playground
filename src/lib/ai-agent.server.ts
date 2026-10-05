import { AI_AGENT_UNLOCK_HOURS } from "./ads/config";

/**
 * TradeVirt AI Agent — uses the developer's own RelayModels key (never Lovable AI).
 * Token-saving rules: cheapest Claude model, short system prompt, only the last
 * few messages as context, trimmed inputs and a hard output cap.
 */
export const AGENT_MODEL = "claude-haiku-4-5";
export const MAX_QUESTION_CHARS = 500;
export const MAX_HISTORY_MESSAGES = 4;
export const MAX_OUTPUT_TOKENS = 450;
/** Abuse guard: even while unlocked, at most this many questions per day. */
export const DAILY_HARD_CAP = 40;

const SYSTEM_PROMPT =
  "You are TradeVirt Coach, an educational assistant inside a paper-trading simulator (virtual money only). " +
  "Explain trading concepts, risk management, charts and the user's simulated trades simply. " +
  "Never give personal financial advice, buy/sell signals, price predictions or guarantees. " +
  "Refuse unrelated, harmful or illegal requests briefly. Reply in the user's language, under 150 words.";

const MODE_STYLE = {
  beginner: "User is a beginner: use very simple words, define any term, give a tiny example.",
  intermediate: "User is intermediate: be concise, mention risk/reward and position sizing where relevant.",
  expert: "User is advanced: be brief and technical, skip basic definitions.",
} as const;

type Db = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export function utcDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function getUsage(db: Db, userId: string) {
  const { data } = await db
    .from("ai_agent_usage")
    .select("*")
    .eq("user_id", userId)
    .eq("usage_date", utcDate())
    .maybeSingle();
  return {
    free_used: Boolean(data?.free_used),
    questions_asked: Number(data?.questions_asked ?? 0),
    unlock_ads: Number(data?.unlock_ads ?? 0),
    first_unlock_at: (data?.first_unlock_at as string | null) ?? null,
    unlocked_until: (data?.unlocked_until as string | null) ?? null,
  };
}

async function save(db: Db, userId: string, patch: Record<string, unknown>) {
  const cur = await getUsage(db, userId);
  await db
    .from("ai_agent_usage")
    .upsert({ user_id: userId, usage_date: utcDate(), ...cur, ...patch }, { onConflict: "user_id,usage_date" });
}

/** Called only after a verified rewarded-ad completion. Returns unlocked hours. */
export async function grantAgentUnlock(db: Db, userId: string): Promise<number> {
  const cur = await getUsage(db, userId);
  const ads = Math.min(cur.unlock_ads + 1, AI_AGENT_UNLOCK_HOURS.length);
  const hours = AI_AGENT_UNLOCK_HOURS[ads - 1]!;
  const first = cur.first_unlock_at ?? new Date().toISOString();
  const until = new Date(new Date(first).getTime() + hours * 3600_000).toISOString();
  await save(db, userId, { unlock_ads: ads, first_unlock_at: first, unlocked_until: until });
  return hours;
}

export function isUnlocked(u: { unlocked_until: string | null }) {
  return !!u.unlocked_until && new Date(u.unlocked_until).getTime() > Date.now();
}

export async function recordQuestion(db: Db, userId: string, usedFree: boolean) {
  const cur = await getUsage(db, userId);
  await save(db, userId, {
    questions_asked: cur.questions_asked + 1,
    free_used: cur.free_used || usedFree,
  });
}

export async function askRelay(
  history: { role: "user" | "assistant"; content: string }[],
  question: string,
  mode: "beginner" | "intermediate" | "expert" = "beginner",
): Promise<string> {
  const key = process.env["RELAYMODELS_API_KEY"];
  if (!key) throw new Error("AI Agent is not configured yet. Please try again later.");
  const messages = [
    { role: "system", content: SYSTEM_PROMPT + " " + MODE_STYLE[mode] },
    ...history.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: m.role, content: m.content.slice(0, 600) })),
    { role: "user", content: question.slice(0, MAX_QUESTION_CHARS) },
  ];
  const res = await fetch("https://api.relaymodels.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: AGENT_MODEL, messages, max_tokens: MAX_OUTPUT_TOKENS }),
  });
  if (res.status === 429) throw new Error("AI Agent is busy. Please try again in a minute.");
  if (!res.ok) {
    console.error("RelayModels error", res.status, (await res.text()).slice(0, 300));
    throw new Error("AI Agent is temporarily unavailable. Please try again later.");
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI Agent could not answer that. Please try another question.");
  return text;
}
