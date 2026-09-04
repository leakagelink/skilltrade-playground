import { isEnabled } from "@/lib/feature-flags";

/**
 * Rewarded advertisements are disabled for Version 1.0.
 *
 * The component is kept as the single entry point so the feature can be
 * re-enabled later with a real ad network, but while the `rewardedAds` flag is
 * off nothing renders and no credit can be requested from the client.
 */
export function RewardedAdButton(_props: { label?: string }) {
  if (!isEnabled("rewardedAds")) return null;
  return null;
}
