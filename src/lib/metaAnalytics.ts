/**
 * Meta App Events wrapper (native Android only, explicit allow-list).
 *
 * - Web / SSR: every call is a no-op.
 * - Only allow-listed events and non-sensitive parameters are sent.
 * - Never send emails, phone, names, ids, tokens, balances, amounts, P/L or journal text.
 * - Failures are swallowed so Meta can never affect the app.
 */

type MetaParamKey =
  | "experience_level"
  | "active_learning_mode"
  | "market_type"
  | "challenge_type"
  | "strategy_type"
  | "career_stage"
  | "content_type";

export type MetaParams = Partial<Record<MetaParamKey, string | undefined>>;

const ALLOWED_PARAMS: MetaParamKey[] = [
  "experience_level",
  "active_learning_mode",
  "market_type",
  "challenge_type",
  "strategy_type",
  "career_stage",
  "content_type",
];

/** Standard Meta event names (Android SDK constants) + TradeVirt custom events. */
const EVENTS = {
  app_open: "tradevirt_app_open",
  complete_registration: "fb_mobile_complete_registration",
  login: "Login",
  view_content: "fb_mobile_content_view",
  search: "fb_mobile_search",
  trade_opened: "trade_opened",
  trade_closed: "trade_closed",
  challenge_completed: "challenge_completed",
  strategy_created: "strategy_created",
  ai_trade_review: "ai_trade_review",
  mode_changed: "mode_changed",
  career_progressed: "career_progressed",
  friend_challenge_created: "friend_challenge_created",
} as const;

type MetaEventKey = keyof typeof EVENTS;

function isNativeAndroid(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
  }).Capacitor;
  return Boolean(cap?.isNativePlatform?.()) && cap?.getPlatform?.() === "android";
}

function sanitise(params?: MetaParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (!params) return out;
  for (const key of ALLOWED_PARAMS) {
    const v = params[key];
    if (typeof v === "string" && v) out[key] = v.slice(0, 40);
  }
  return out;
}

type MetaPlugin = { logEvent(o: { name: string; params: Record<string, string> }): Promise<void> };
let pluginPromise: Promise<MetaPlugin | null> | null = null;

function getPlugin(): Promise<MetaPlugin | null> {
  if (!pluginPromise) {
    pluginPromise = (async () => {
      const { Capacitor, registerPlugin } = await import("@capacitor/core");
      if (!Capacitor.isPluginAvailable("MetaEvents")) return null;
      // Return in a wrapper object: never return a plugin proxy from an async fn.
      const p = registerPlugin<MetaPlugin>("MetaEvents");
      return { logEvent: (o: { name: string; params: Record<string, string> }) => p.logEvent(o) };
    })().catch(() => null);
  }
  return pluginPromise;
}

// De-duplicate rapid repeats (re-renders, lifecycle, navigation).
const lastSent = new Map<string, number>();
const DEDUPE_MS = 2000;

async function send(key: MetaEventKey, params?: MetaParams): Promise<void> {
  try {
    if (!isNativeAndroid()) return;
    const clean = sanitise(params);
    const sig = key + JSON.stringify(clean);
    const now = Date.now();
    if (now - (lastSent.get(sig) ?? 0) < DEDUPE_MS) return;
    lastSent.set(sig, now);
    const plugin = await getPlugin();
    if (!plugin) return;
    await plugin.logEvent({ name: EVENTS[key], params: clean });
  } catch {
    /* Meta must never affect the app */
  }
}

let appOpenSent = false;
export function logAppOpen() {
  if (appOpenSent) return;
  appOpenSent = true;
  void send("app_open");
}
export const logCompleteRegistration = () => void send("complete_registration");
export const logLogin = () => void send("login");
export const logViewContent = (content_type: string) => void send("view_content", { content_type });
export const logSearch = (market_type?: string) => void send("search", { market_type });
export const logTradeOpened = (market_type?: string) => void send("trade_opened", { market_type });
export const logTradeClosed = (market_type?: string) => void send("trade_closed", { market_type });
export const logChallengeCompleted = (challenge_type?: string) =>
  void send("challenge_completed", { challenge_type });
export const logStrategyCreated = (strategy_type?: string) =>
  void send("strategy_created", { strategy_type });
export const logAITradeReview = () => void send("ai_trade_review");
export const logModeChanged = (active_learning_mode?: string) =>
  void send("mode_changed", { active_learning_mode });
export const logCareerProgressed = (career_stage?: string) =>
  void send("career_progressed", { career_stage });
export const logFriendChallengeCreated = () => void send("friend_challenge_created");
