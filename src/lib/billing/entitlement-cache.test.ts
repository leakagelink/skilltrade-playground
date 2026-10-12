import { describe, expect, it } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { adStatusKey, clearBillingCache, entitlementKey, isBillingQueryKey, resolveAdFree } from "./entitlement-cache";

const PRO = { tier: "pro", features: { adFree: true } };
const FREE = { tier: "free", features: { adFree: false } };

function observe(qc: QueryClient, userId: string, fn: () => Promise<unknown>) {
  const obs = new QueryObserver(qc, { queryKey: entitlementKey(userId), queryFn: fn, retry: false });
  const unsub = obs.subscribe(() => {});
  return { obs, unsub, adFree: () => resolveAdFree(obs.getCurrentResult() as never, userId) };
}

describe("entitlement cache isolation", () => {
  it("keys are per user", () => {
    expect(entitlementKey("a")).not.toEqual(entitlementKey("b"));
    expect(adStatusKey("a")).not.toEqual(adStatusKey("b"));
    expect(isBillingQueryKey(entitlementKey("a"))).toBe(true);
    expect(isBillingQueryKey(["profile"])).toBe(false);
  });

  it("User A (Pro) logs out, User B (free) logs in: B never ad-free, even while loading", async () => {
    const qc = new QueryClient();
    const a = observe(qc, "userA", async () => PRO);
    await a.obs.refetch();
    expect(a.adFree()).toBe(true);
    a.unsub();

    clearBillingCache(qc); // logout
    expect(qc.getQueryData(entitlementKey("userA"))).toBeUndefined();

    let release!: (v: unknown) => void;
    const b = observe(qc, "userB", () => new Promise((r) => (release = r)));
    expect(b.obs.getCurrentResult().status).toBe("pending");
    expect(b.adFree()).toBe(false); // loading
    release(FREE);
    await new Promise((r) => setTimeout(r, 0));
    expect(b.adFree()).toBe(false);
    b.unsub();
  });

  it("account switch without logout: B's key never sees A's data", async () => {
    const qc = new QueryClient();
    qc.setQueryData(entitlementKey("userA"), PRO);
    const b = observe(qc, "userB", () => new Promise(() => {}));
    expect(b.obs.getCurrentResult().data).toBeUndefined();
    expect(b.adFree()).toBe(false);
    b.unsub();
  });

  it("failed entitlement request falls back to free rules", async () => {
    const qc = new QueryClient();
    const b = observe(qc, "userB", async () => {
      throw new Error("network");
    });
    await b.obs.refetch();
    expect(b.obs.getCurrentResult().status).toBe("error");
    expect(b.adFree()).toBe(false);
    b.unsub();
  });

  it("expired session / no user never grants ad-free", () => {
    expect(resolveAdFree({ status: "success", data: PRO }, null)).toBe(false);
    expect(resolveAdFree({ status: "success", data: PRO }, undefined)).toBe(false);
  });

  it("stale restored data that was not refetched this session does not grant ad-free", () => {
    expect(resolveAdFree({ status: "success", isFetchedAfterMount: false, data: PRO }, "userA")).toBe(false);
    expect(resolveAdFree({ status: "success", isFetchedAfterMount: true, data: PRO }, "userA")).toBe(true);
  });

  it("clearBillingCache removes entitlement and ad-status for all users", () => {
    const qc = new QueryClient();
    qc.setQueryData(entitlementKey("userA"), PRO);
    qc.setQueryData(adStatusKey("userA"), { adFree: true });
    qc.setQueryData(["profile"], { x: 1 });
    clearBillingCache(qc);
    expect(qc.getQueryData(entitlementKey("userA"))).toBeUndefined();
    expect(qc.getQueryData(adStatusKey("userA"))).toBeUndefined();
    expect(qc.getQueryData(["profile"])).toEqual({ x: 1 });
  });
});
