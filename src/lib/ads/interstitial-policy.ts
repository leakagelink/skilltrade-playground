import { AD_LIMITS } from "./config";

export function interstitialWithinLimits(activity: {
  interstitial_ads_shown: number;
  rewarded_ads_completed: number;
  last_interstitial_at: string | null;
}, now = Date.now()): boolean {
  if (activity.interstitial_ads_shown >= AD_LIMITS.INTERSTITIAL_PER_DAY) return false;
  if (activity.interstitial_ads_shown + activity.rewarded_ads_completed >= AD_LIMITS.TOTAL_PER_DAY) return false;
  if (activity.last_interstitial_at) {
    const last = Date.parse(activity.last_interstitial_at);
    if (!Number.isFinite(last) || now - last < AD_LIMITS.INTERSTITIAL_MIN_INTERVAL_MINUTES * 60_000) return false;
  }
  return true;
}