/**
 * Version 2.0 — centralised Google AdMob configuration.
 *
 * AdMob App IDs and Ad Unit IDs are public identifiers (they ship inside the
 * Android app), so they are not secrets. They live here — and only here — so
 * no ad unit id is scattered across the codebase.
 *
 * Ads are 100% optional monetisation. They never gate authentication, paper
 * trading, portfolio, history, charts, daily rewards or account deletion.
 */

/** Production units (Google AdMob account of the TradeVirt developer). */
export const ADMOB_APP_ID = "ca-app-pub-1475323931624357~4494827471";
export const ADMOB_REWARDED_AD_UNIT_ID = "ca-app-pub-1475323931624357/7892970831";
export const ADMOB_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-1475323931624357/2850573316";
export const ADMOB_BANNER_AD_UNIT_ID = "ca-app-pub-1475323931624357/3185317484";

/** Google's official sample units — used in every non-production build. */
export const ADMOB_TEST_REWARDED_AD_UNIT_ID = "ca-app-pub-3940256099942544/5224354917";
export const ADMOB_TEST_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712";
export const ADMOB_TEST_BANNER_AD_UNIT_ID = "ca-app-pub-3940256099942544/6300978111";

/**
 * Test ads are used unless this is a production build. This makes it
 * impossible for test units to reach a Play Store release build, and equally
 * impossible for a development device to generate production ad traffic.
 */
export const ADS_USE_TEST_ADS = import.meta.env.MODE !== "production";

export const REWARDED_AD_UNIT_ID = ADS_USE_TEST_ADS
  ? ADMOB_TEST_REWARDED_AD_UNIT_ID
  : ADMOB_REWARDED_AD_UNIT_ID;

export const INTERSTITIAL_AD_UNIT_ID = ADS_USE_TEST_ADS
  ? ADMOB_TEST_INTERSTITIAL_AD_UNIT_ID
  : ADMOB_INTERSTITIAL_AD_UNIT_ID;

export const BANNER_AD_UNIT_ID = ADS_USE_TEST_ADS
  ? ADMOB_TEST_BANNER_AD_UNIT_ID
  : ADMOB_BANNER_AD_UNIT_ID;

/** Formats can be disabled independently without deleting the ad system. */
export const AD_FLAGS = {
  ADS_ENABLED: true,
  REWARDED_ADS_ENABLED: true,
  INTERSTITIAL_ADS_ENABLED: true,
  /**
   * Small bottom banner, shown only on calm browsing screens (Home, Profile,
   * Leaderboard, Goals) in reserved space that never covers content or buttons.
   */
  BANNER_ADS_ENABLED: true,
} as const;

/* ------------------------------------------------------------------ */
/* Frequency limits (enforced on the server, mirrored here for the UI) */
/* ------------------------------------------------------------------ */

export const AD_LIMITS = {
  TOTAL_PER_DAY: 11,
  REWARDED_PER_DAY: 8,
  INTERSTITIAL_PER_DAY: 3,
  INTERSTITIAL_MIN_INTERVAL_MINUTES: 15,
  AI_COACH_REWARDED_PER_DAY: 3,
  CAREER_REWARDED_PER_DAY: 1,
  ARENA_REWARDED_PER_DAY: 1,
  DAILY_DOUBLE_PER_DAY: 1,
  AI_AGENT_REWARDED_PER_DAY: 3,
} as const;

/** AI Agent unlock: 1 ad = 5h, 2 ads = 10h, 3 ads = 24h (counted from the first unlock of the day). */
export const AI_AGENT_UNLOCK_HOURS = [5, 10, 24] as const;

export const REWARDED_PLACEMENTS = ["AI_COACH", "CAREER", "ARENA", "DAILY_DOUBLE", "AI_AGENT"] as const;
export type RewardedPlacement = (typeof REWARDED_PLACEMENTS)[number];

export const INTERSTITIAL_PLACEMENTS = [
  "CAREER_MILESTONE_CONTINUE",
  "CHALLENGE_COMPLETE_CONTINUE",
  "ARENA_RESULT_CONTINUE",
] as const;
export type InterstitialPlacement = (typeof INTERSTITIAL_PLACEMENTS)[number];

/** Every reward is virtual, non-transferable and has no monetary value. */
export const REWARD_BY_PLACEMENT: Record<
  RewardedPlacement,
  { type: "AI_ANALYSIS" | "XP" | "CREDITS" | "AI_UNLOCK"; amount: number; label: string }
> = {
  AI_COACH: { type: "AI_ANALYSIS", amount: 1, label: "1 extra AI analysis today" },
  CAREER: { type: "XP", amount: 25, label: "25 bonus XP" },
  ARENA: { type: "XP", amount: 25, label: "25 bonus XP" },
  /** Doubles today's daily reward (matches DAILY_REWARD_CREDITS on the server). */
  DAILY_DOUBLE: { type: "CREDITS", amount: 3, label: "+3 bonus Trading Credits (2x daily reward)" },
  AI_AGENT: { type: "AI_UNLOCK", amount: 1, label: "more AI Agent time" },
};

export const AD_DISCLOSURE =
  "Ads are optional. Rewards are virtual only — they have no cash value, cannot be withdrawn, transferred or exchanged for money.";

export const AD_UNAVAILABLE_MESSAGE = "Ad is currently unavailable. Please try again later.";
export const AD_LIMIT_MESSAGE = "Daily ad reward limit reached. Please try again tomorrow.";
