/**
 * Version 1.0 feature flags. Premium/subscription features are architected but
 * disabled — no pricing and no payment functionality ships in v1.
 */
export const FEATURE_FLAGS = {
  bannerAds: false,
  /** Version 2.0: genuine Google AdMob interstitials at natural breaks only. */
  interstitialAds: true,
  nativeAds: false,
  /**
   * Version 2.0: optional Google AdMob rewarded ads. Rewards are virtual only
   * (extra AI analysis / bonus XP), granted server-side after a genuine SDK
   * reward callback. Never credits, never money.
   */
  rewardedAds: true,
  subscriptions: false,
  aiTradeReviewAdvanced: false,
  aiBotMode: true, // simulation-only placeholder
  aiVsUser: true,
  advancedAnalytics: false,
  tradingJournal: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}
