import { describe, expect, it } from "vitest";
import { BILLING_DETAILS, PLAN_DETAILS } from "./plan-presentation";
import { featuresForTier } from "./plans";

describe("truthful subscription presentation", () => {
  it("gives each plan a distinct reason and purchase action", () => {
    expect(new Set(Object.values(PLAN_DETAILS).map(p => p.reason)).size).toBe(3);
    expect(new Set(Object.values(PLAN_DETAILS).map(p => p.action)).size).toBe(3);
  });
  it("does not imply that Basic unlocks tools or removes ads", () => {
    expect(featuresForTier("basic").adFree).toBe(false);
    expect(PLAN_DETAILS.basic.limitation).toContain("available on Free");
    expect(PLAN_DETAILS.basic.limitation).toContain("Ads remain enabled");
  });
  it("discloses that Elite has the same features as Pro", () => {
    expect(featuresForTier("pro")).toEqual(featuresForTier("elite"));
    expect(PLAN_DETAILS.elite.limitation).toContain("Same feature access as Pro");
    expect(PLAN_DETAILS.elite.reason).toContain("Pro provides the same ad-free access");
  });
  it("distinguishes annual upfront billing without promising extra features or savings", () => {
    expect(BILLING_DETAILS.yearly.description).toContain("full yearly price upfront");
    expect(BILLING_DETAILS.yearly.description).toContain("does not unlock extra features");
    expect(BILLING_DETAILS.monthly.description).toContain("renews every month");
  });
});