/**
 * Version 1.0 feature flags. Premium/subscription features are architected but
 * disabled — no pricing and no payment functionality ships in v1.
 */
export const FEATURE_FLAGS = {
  bannerAds: false,
  interstitialAds: false,
  nativeAds: false,
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
