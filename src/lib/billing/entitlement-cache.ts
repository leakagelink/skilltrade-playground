import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * Subscription / ad-eligibility cache rules (browser-safe).
 * Cached entries are always keyed by the signed-in user's id, are never
 * persisted to device storage, and are dropped on every auth change, so one
 * account's paid status can never be shown to another account.
 * The server (verifyAndStore + server ad gates) stays the source of truth.
 */
export const BILLING_QUERY_ROOTS = ["entitlement", "ad-status"] as const;

export const entitlementKey = (userId: string | null | undefined) => ["entitlement", userId ?? "anon"] as const;
export const adStatusKey = (userId: string | null | undefined) => ["ad-status", userId ?? "anon"] as const;

export function isBillingQueryKey(key: QueryKey): boolean {
  return typeof key[0] === "string" && (BILLING_QUERY_ROOTS as readonly string[]).includes(key[0]);
}

/** Remove (not just invalidate) every billing entry so no stale data can render. */
export function clearBillingCache(qc: QueryClient): void {
  for (const root of BILLING_QUERY_ROOTS) {
    void qc.cancelQueries({ queryKey: [root] });
    qc.removeQueries({ queryKey: [root] });
  }
}

type EntitlementQueryLike = {
  status: "pending" | "error" | "success";
  isFetchedAfterMount?: boolean;
  data?: { features?: { adFree?: boolean } } | undefined;
};

/**
 * Ad-free only when this user's entitlement was fetched successfully from the
 * server in this session. Loading, errors, or missing user → free rules.
 */
export function resolveAdFree(query: EntitlementQueryLike, userId: string | null | undefined): boolean {
  if (!userId) return false;
  if (query.status !== "success") return false;
  if (query.isFetchedAfterMount === false) return false;
  return query.data?.features?.adFree === true;
}
