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

/** Google's official sample units — used in every non-production build. */
export const ADMOB_TEST_REWARDED_AD_UNIT_ID = "ca-app-pub-3940256099942544/5224354917";
export const ADMOB_TEST_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712";

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

/** Formats can be disabled independently without deleting the ad system. */
export const AD_FLAGS = {
  ADS_ENABLED: true,
  REWARDED_ADS_ENABLED: true,
  INTERSTITIAL_ADS_ENABLED: true,
  /** Banner / app-open / rewarded-interstitial formats are intentionally absent. */
} as const;

/* ------------------------------------------------------------------ */
/* Frequency limits (enforced on the server, mirrored here for the UI) */
/* ------------------------------------------------------------------ */

export const AD_LIMITS = {
  TOTAL_PER_DAY: 8,
  REWARDED_PER_DAY: 5,
  INTERSTITIAL_PER_DAY: 3,
  INTERSTITIAL_MIN_INTERVAL_MINUTES: 15,
  AI_COACH_REWARDED_PER_DAY: 3,
  CAREER_REWARDED_PER_DAY: 1,
  ARENA_REWARDED_PER_DAY: 1,
} as const;

export const REWARDED_PLACEMENTS = ["AI_COACH", "CAREER", "ARENA"] as const;
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
  { type: "AI_ANALYSIS" | "XP"; amount: number; label: string }
> = {
  AI_COACH: { type: "AI_ANALYSIS", amount: 1, label: "1 extra AI analysis today" },
  CAREER: { type: "XP", amount: 25, label: "25 bonus XP" },
  ARENA: { type: "XP", amount: 25, label: "25 bonus XP" },
};

export const AD_DISCLOSURE =
  "Ads are optional. Rewards are virtual only — they have no cash value, cannot be withdrawn, transferred or exchanged for money.";

export const AD_UNAVAILABLE_MESSAGE = "Ad is currently unavailable. Please try again later.";
export const AD_LIMIT_MESSAGE = "Daily ad reward limit reached. Please try again tomorrow.";
