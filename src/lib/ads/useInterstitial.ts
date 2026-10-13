import { useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordInterstitialShown, requestInterstitial } from "@/lib/ads.functions";
import type { InterstitialPlacement } from "./config";
import { adsAvailable, preloadInterstitial, showInterstitialAd } from "./admob-bridge";

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
  const continuing = useRef(false);

  return useCallback(
    async (placement: InterstitialPlacement, onContinue: () => void) => {
      if (continuing.current) return;
      continuing.current = true;
      try {
        if (!(await adsAvailable())) return;
        const decision = await request({ data: { placement } });
        if (decision.allowed && decision.token) {
          const token = decision.token;
          await showInterstitialAd(() => { void record({ data: { token } }).catch(() => {}); });
          void preloadInterstitial();
        }
      } catch {
        /* ads must never block the user */
      } finally {
        continuing.current = false;
        onContinue();
      }
    },
    [record, request],
  );
}
