/**
 * Centralised analytics + crash reporting service (Firebase, native Android only).
 *
 * Privacy rules (enforced here, not at call sites):
 * - No emails, names, phone numbers, tokens, passwords, raw Supabase user ids,
 *   balances or any other personal / financial value is ever sent.
 * - Only a small allow-list of non-personal parameters is forwarded.
 * - On the web (and during SSR) every call is a no-op: the Firebase native
 *   plugins simply are not available there and we do NOT substitute the
 *   Firebase web SDK.
 */

export type AnalyticsEvent =
  | "sign_up_completed"
  | "login_completed"
  | "logout_completed"
  | "first_trade_opened"
  | "first_trade_completed"
  | "trade_opened"
  | "trade_closed"
  | "challenge_completed"
  | "ai_coach_used"
  | "trader_dna_viewed"
  | "ai_arena_started"
  | "ai_arena_completed"
  | "career_mode_started"
  | "career_level_completed"
  | "leaderboard_viewed"
  | "daily_reward_claimed";

/** The only parameter keys allowed to leave the device. */
const ALLOWED_PARAMS = [
  "asset_type",
  "market_type",
  "challenge_type",
  "career_level",
  "career_stage",
  "ai_bot_type",
  "outcome",
  "method",
  "duration_days",
  "placement",
] as const;

export type AnalyticsParams = Partial<
  Record<(typeof ALLOWED_PARAMS)[number], string | number | boolean>
>;

function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

function sanitise(params?: AnalyticsParams): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!params) return out;
  for (const key of ALLOWED_PARAMS) {
    const value = params[key];
    if (value === undefined || value === null) continue;
    out[key] = typeof value === "string" ? value.slice(0, 100) : value;
  }
  return out;
}

let initPromise: Promise<void> | null = null;

async function ensureInit(): Promise<boolean> {
  if (!isNative()) return false;
  if (!initPromise) {
    initPromise = (async () => {
      const { FirebaseAnalytics } = await import("@capacitor-firebase/analytics");
      await FirebaseAnalytics.setEnabled({ enabled: true });
    })().catch(() => undefined);
  }
  await initPromise;
  return true;
}

/** Track a product event. Call only after the underlying action truly succeeded. */
export async function trackEvent(name: AnalyticsEvent, params?: AnalyticsParams): Promise<void> {
  try {
    if (!(await ensureInit())) return;
    const { FirebaseAnalytics } = await import("@capacitor-firebase/analytics");
    await FirebaseAnalytics.logEvent({ name, params: sanitise(params) });
  } catch {
    // Analytics must never affect the app.
  }
}

/** Screen view (screen names only — never route params containing ids). */
export async function trackScreen(screenName: string): Promise<void> {
  try {
    if (!(await ensureInit())) return;
    const { FirebaseAnalytics } = await import("@capacitor-firebase/analytics");
    await FirebaseAnalytics.setCurrentScreen({ screenName });
  } catch {
    /* ignore */
  }
}

/** Clear any analytics state on sign-out. */
export async function resetAnalytics(): Promise<void> {
  try {
    if (!(await ensureInit())) return;
    const { FirebaseAnalytics } = await import("@capacitor-firebase/analytics");
    await FirebaseAnalytics.resetAnalyticsData();
  } catch {
    /* ignore */
  }
}

/**
 * Report a non-fatal error to Crashlytics. Only the error type and a short,
 * developer-authored context label are sent — never message payloads that may
 * contain user data.
 */
export async function reportNonFatal(context: string, error: unknown): Promise<void> {
  try {
    if (!isNative()) return;
    const { FirebaseCrashlytics } = await import("@capacitor-firebase/crashlytics");
    const type = error instanceof Error ? error.name : typeof error;
    await FirebaseCrashlytics.recordException({ message: `${context}: ${type}` });
  } catch {
    /* ignore */
  }
}
