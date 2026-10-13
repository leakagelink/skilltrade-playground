import { describe, expect, it } from "vitest";
import { featuresForTier, isEntitled, pickTier } from "./plans";
import { parseRtdnPush, rtdnPatch, rtdnToken, safeEqual } from "./rtdn";

const NOW = Date.parse("2026-10-13T00:00:00Z");
const future = "2026-11-13T00:00:00Z";
const past = "2026-10-01T00:00:00Z";
const row = (product_id: string, status: string, expires_at: string | null) => ({ product_id, status, expires_at });

describe("entitlements", () => {
  it("Basic keeps ads, Pro/Elite are ad-free", () => {
    expect(featuresForTier(pickTier([row("tradevirt_basic", "SUBSCRIPTION_STATE_ACTIVE", future)], NOW)).adFree).toBe(false);
    expect(featuresForTier(pickTier([row("tradevirt_pro", "SUBSCRIPTION_STATE_ACTIVE", future)], NOW)).adFree).toBe(true);
    expect(featuresForTier(pickTier([row("tradevirt_elite", "SUBSCRIPTION_STATE_ACTIVE", future)], NOW)).adFree).toBe(true);
    expect(featuresForTier("free").adFree).toBe(false);
  });
  it("pending, on-hold, paused and unknown products unlock nothing", () => {
    for (const s of ["SUBSCRIPTION_STATE_PENDING", "SUBSCRIPTION_STATE_ON_HOLD", "SUBSCRIPTION_STATE_PAUSED"])
      expect(pickTier([row("tradevirt_pro", s, future)], NOW)).toBe("free");
    expect(pickTier([row("someone_else", "SUBSCRIPTION_STATE_ACTIVE", future)], NOW)).toBe("free");
  });
  it("cancelled keeps access only until expiry; expired loses it", () => {
    expect(isEntitled("SUBSCRIPTION_STATE_CANCELED", future, NOW)).toBe(true);
    expect(isEntitled("SUBSCRIPTION_STATE_CANCELED", past, NOW)).toBe(false);
    expect(isEntitled("SUBSCRIPTION_STATE_EXPIRED", future, NOW)).toBe(false);
    expect(isEntitled("SUBSCRIPTION_STATE_ACTIVE", null, NOW)).toBe(false);
  });
  it("highest valid tier wins", () => {
    expect(pickTier([row("tradevirt_basic", "SUBSCRIPTION_STATE_ACTIVE", future), row("tradevirt_elite", "SUBSCRIPTION_STATE_EXPIRED", future)], NOW)).toBe("basic");
  });
});

describe("RTDN", () => {
  const enc = (o: unknown) => ({ message: { data: btoa(JSON.stringify(o)) } });
  it("rejects wrong/empty secrets", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abd", "abc")).toBe(false);
    expect(safeEqual("", "")).toBe(false);
    expect(safeEqual("ab", "abc")).toBe(false);
  });
  it("handles malformed Pub/Sub payloads", () => {
    expect(parseRtdnPush(null)).toBeNull();
    expect(parseRtdnPush({ message: {} })).toBeNull();
    expect(parseRtdnPush({ message: { data: "!!notbase64" } })).toBeNull();
    expect(parseRtdnPush({ message: { data: btoa("not json") } })).toBeNull();
  });
  it("extracts subscription and voided tokens", () => {
    const m = parseRtdnPush(enc({ packageName: "online.tradevirt.app", subscriptionNotification: { purchaseToken: "tok" } }))!;
    expect(m.packageName).toBe("online.tradevirt.app");
    expect(rtdnToken(m)).toBe("tok");
    expect(rtdnToken({ voidedPurchaseNotification: { purchaseToken: "v" } })).toBe("v");
  });
  it("refund/revocation expires access immediately", () => {
    const p = rtdnPatch({ subscriptionState: "SUBSCRIPTION_STATE_ACTIVE", lineItems: [{ productId: "tradevirt_pro", expiryTime: future }] }, true, row("tradevirt_pro", "", future), new Date(NOW));
    expect(p.status).toBe("SUBSCRIPTION_STATE_EXPIRED");
    expect(pickTier([row("tradevirt_pro", p.status, p.expires_at)], NOW)).toBe("free");
  });
  it("uses Google's state, and duplicate delivery is idempotent", () => {
    const sub = { subscriptionState: "SUBSCRIPTION_STATE_CANCELED", lineItems: [{ productId: "tradevirt_pro", expiryTime: future }] };
    const a = rtdnPatch(sub, false, row("tradevirt_pro", "", past), new Date(NOW));
    const b = rtdnPatch(sub, false, row("tradevirt_pro", a.status, a.expires_at), new Date(NOW));
    expect(a).toEqual(b);
    expect(a.expires_at).toBe(future);
    expect(rtdnPatch(null, false, row("tradevirt_pro", "", future), new Date(NOW)).status).toBe("SUBSCRIPTION_STATE_EXPIRED");
  });
});
