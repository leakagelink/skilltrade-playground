import { describe, expect, it } from "vitest";
import { AD_LIMITS, INTERSTITIAL_PLACEMENTS } from "./config";
import { interstitialWithinLimits } from "./interstitial-policy";

const now = Date.parse("2026-10-13T09:00:00Z");
const activity = { interstitial_ads_shown: 0, rewarded_ads_completed: 0, last_interstitial_at: null };

describe("interstitial frequency", () => {
  it("allows seven interstitials while retaining eight rewarded opportunities", () => {
    expect(AD_LIMITS.TOTAL_PER_DAY).toBe(15);
    expect(AD_LIMITS.REWARDED_PER_DAY).toBe(8);
    expect(interstitialWithinLimits({ ...activity, interstitial_ads_shown: 6, rewarded_ads_completed: 8 }, now)).toBe(true);
    expect(interstitialWithinLimits({ ...activity, interstitial_ads_shown: 7 }, now)).toBe(false);
    expect(interstitialWithinLimits({ ...activity, interstitial_ads_shown: 6, rewarded_ads_completed: 9 }, now)).toBe(false);
  });
  it("enforces at least two minutes and rejects invalid/future timestamps", () => {
    for (const elapsed of [0, 119_999, -1]) {
      expect(interstitialWithinLimits({ ...activity, last_interstitial_at: new Date(now - elapsed).toISOString() }, now)).toBe(false);
    }
    expect(interstitialWithinLimits({ ...activity, last_interstitial_at: new Date(now - 120_000).toISOString() }, now)).toBe(true);
    expect(interstitialWithinLimits({ ...activity, last_interstitial_at: "invalid" }, now)).toBe(false);
  });
  it("only exposes deliberate completion placements", () => {
    expect(INTERSTITIAL_PLACEMENTS).toEqual(["CAREER_MILESTONE_CONTINUE", "CHALLENGE_COMPLETE_CONTINUE", "ARENA_RESULT_CONTINUE", "TRADE_COMPLETE_CONTINUE", "STRATEGY_SAVED_CONTINUE", "JOURNAL_SAVED_CONTINUE"]);
  });
});