import { describe, expect, it } from "vitest";
import { BILLING_DETAILS, PLAN_DETAILS } from "./plan-presentation";
import { featuresForTier } from "./plans";

describe("truthful subscription presentation", () => {
  it("gives each plan a distinct reason and purchase action", () => {
    expect(new Set(Object.values(PLAN_DETAILS).map(p => p.reason)).size).toBe(3);
    expect(new Set(Object.values(PLAN_DETAILS).map(p => p.action)).size).toBe(3);
  });
  it("Basic adds risk planning but keeps ads", () => {
    expect(featuresForTier("basic").adFree).toBe(false);
    expect(featuresForTier("basic").riskPlanner).toBe(true);
    expect(PLAN_DETAILS.basic.limitation).toContain("Ads remain enabled");
  });
  it("Elite adds the stress lab beyond Pro", () => {
    expect(featuresForTier("pro").stressLab).toBe(false);
    expect(featuresForTier("elite").stressLab).toBe(true);
    expect(PLAN_DETAILS.elite.reason).toContain("losing-streak");
  });
  it("distinguishes annual upfront billing without promising extra features or savings", () => {
    expect(BILLING_DETAILS.yearly.description).toContain("full yearly price upfront");
    expect(BILLING_DETAILS.yearly.description).toContain("does not unlock extra features");
    expect(BILLING_DETAILS.monthly.description).toContain("renews every month");
  });
});