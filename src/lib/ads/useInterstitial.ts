import { useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordInterstitialShown, requestInterstitial } from "@/lib/ads.functions";
import type { InterstitialPlacement } from "./config";
import { preloadInterstitial, showInterstitialAd } from "./admob.client";

/**
 * Shows an interstitial only at a natural break, after the user has already
 * seen their result and explicitly tapped "Continue".
 *
 * The ad never blocks navigation: whatever happens (no ad, load failure, limit
 * reached, web build) the continuation always runs.
 */
export function useInterstitialContinue() {
  const request = useServerFn(requestInterstitial);
  const record = useServerFn(recordInterstitialShown);

  return useCallback(
    async (placement: InterstitialPlacement, onContinue: () => void) => {
      try {
        const decision = await request({ data: { placement } });
        if (decision.allowed && decision.token) {
          const shown = await showInterstitialAd();
          if (shown) await record({ data: { token: decision.token } });
          void preloadInterstitial();
        }
      } catch {
        /* ads must never block the user */
      } finally {
        onContinue();
      }
    },
    [record, request],
  );
}
