/**
 * Subscription catalogue (browser-safe). Prices here are display targets only —
 * the authoritative price always comes from Google Play at runtime.
 */
export type Tier = "free" | "basic" | "pro" | "elite";
export type PlanProductId = "tradevirt_basic" | "tradevirt_pro" | "tradevirt_elite";
export type BasePlanId = "monthly" | "yearly";

export const ANDROID_PACKAGE = "online.tradevirt.app";

export const PLANS: {
  productId: PlanProductId;
  tier: Exclude<Tier, "free">;
  name: string;
  adFree: boolean;
  benefits: string[];
}[] = [
  {
    productId: "tradevirt_basic",
    tier: "basic",
    name: "Basic",
    adFree: false,
    benefits: ["Supports TradeVirt development", "All current app features", "Ads still shown"],
  },
  {
    productId: "tradevirt_pro",
    tier: "pro",
    name: "Pro",
    adFree: true,
    benefits: ["Completely ad-free", "All current app features"],
  },
  {
    productId: "tradevirt_elite",
    tier: "elite",
    name: "Elite",
    adFree: true,
    benefits: ["Completely ad-free", "All current app features", "Highest support tier"],
  },
];

export const TIER_RANK: Record<Tier, number> = { free: 0, basic: 1, pro: 2, elite: 3 };

export function tierForProduct(productId: string): Tier {
  return PLANS.find((p) => p.productId === productId)?.tier ?? "free";
}

/** Central feature-access layer. Only real, working benefits live here. */
export function featuresForTier(tier: Tier) {
  return { adFree: tier === "pro" || tier === "elite" };
}

/** Google Play states that still grant access. CANCELED keeps access until expiry. */
export const ENTITLED_STATES = [
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  "SUBSCRIPTION_STATE_CANCELED",
];

export function isEntitled(status: string, expiresAt: string | null, now = Date.now()): boolean {
  if (!ENTITLED_STATES.includes(status)) return false;
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > now;
}

export function pickTier(rows: { product_id: string; status: string; expires_at: string | null }[], now = Date.now()): Tier {
  let best: Tier = "free";
  for (const r of rows) {
    if (!isEntitled(r.status, r.expires_at, now)) continue;
    const t = tierForProduct(r.product_id);
    if (TIER_RANK[t] > TIER_RANK[best]) best = t;
  }
  return best;
}
