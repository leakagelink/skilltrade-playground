import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { featuresForTier, pickTier, PLANS, type Tier } from "./billing/plans";

const REVERIFY_MS = 6 * 60 * 60 * 1000;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type Row = {
  id: string;
  user_id: string;
  product_id: string;
  purchase_token: string;
  status: string;
  expires_at: string | null;
  last_verified_at: string;
};

/** Verifies one token with Google and upserts it. Never trusts client data. */
async function verifyAndStore(userId: string, productId: string, purchaseToken: string) {
  const play = await import("./billing/play.server");
  if (!play.playConfigured()) throw new Error("Subscriptions are not available yet. Please try again later.");
  if (!PLANS.some((p) => p.productId === productId)) throw new Error("Unknown subscription.");

  const db = await admin();
  const hash = await play.sha256(purchaseToken);
  const { data: existing } = await db.from("play_subscriptions").select("user_id").eq("purchase_token_hash", hash).maybeSingle();
  if (existing && existing.user_id !== userId) throw new Error("This purchase belongs to another TradeVirt account.");

  const sub = await play.fetchSubscription(purchaseToken);
  if (!sub) throw new Error("Google Play could not confirm this purchase.");
  const line = sub.lineItems?.find((l) => l.productId === productId);
  if (!line) throw new Error("This purchase does not match the selected plan.");

  const expected = await play.accountIdFor(userId);
  const bound = sub.externalAccountIdentifiers?.obfuscatedExternalAccountId;
  if (bound && bound !== expected) throw new Error("This purchase belongs to another TradeVirt account.");

  const status = sub.subscriptionState;
  if (status === "SUBSCRIPTION_STATE_PENDING") {
    return { pending: true };
  }

  let acknowledged = sub.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED";
  if (!acknowledged && status === "SUBSCRIPTION_STATE_ACTIVE") {
    await play.acknowledge(productId, purchaseToken);
    acknowledged = true;
  }

  // An upgrade/downgrade replaces the previous token: retire it.
  if (sub.linkedPurchaseToken) {
    const oldHash = await play.sha256(sub.linkedPurchaseToken);
    await db.from("play_subscriptions").update({ status: "SUBSCRIPTION_STATE_EXPIRED" }).eq("purchase_token_hash", oldHash).eq("user_id", userId);
  }

  const { error } = await db.from("play_subscriptions").upsert(
    {
      user_id: userId,
      product_id: productId,
      base_plan_id: line.offerDetails?.basePlanId ?? null,
      purchase_token_hash: hash,
      purchase_token: purchaseToken,
      status,
      started_at: sub.startTime ?? null,
      expires_at: line.expiryTime ?? null,
      auto_renewing: line.autoRenewingPlan?.autoRenewEnabled ?? null,
      acknowledged,
      latest_order_id: sub.latestOrderId ?? null,
      last_verified_at: new Date().toISOString(),
    },
    { onConflict: "purchase_token_hash" },
  );
  if (error) throw new Error("Could not save your subscription. Please use Restore Purchases.");
  return { pending: false };
}

export async function getUserTier(userId: string): Promise<Tier> {
  const db = await admin();
  const { data } = await db.from("play_subscriptions").select("product_id,status,expires_at").eq("user_id", userId);
  return pickTier((data ?? []) as Row[]);
}

export async function isAdFree(userId: string): Promise<boolean> {
  try {
    return featuresForTier(await getUserTier(userId)).adFree;
  } catch {
    return false; // never fabricate premium on errors
  }
}

export const getEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const play = await import("./billing/play.server");
    const { data } = await db.from("play_subscriptions").select("*").eq("user_id", context.userId);
    const rows = (data ?? []) as Row[];

    // Periodic re-check so renewals, cancellations and revocations are picked up.
    if (play.playConfigured()) {
      for (const r of rows) {
        if (r.status === "SUBSCRIPTION_STATE_EXPIRED") continue;
        if (Date.now() - new Date(r.last_verified_at).getTime() < REVERIFY_MS) continue;
        try {
          const sub = await play.fetchSubscription(r.purchase_token);
          const line = sub?.lineItems?.find((l) => l.productId === r.product_id);
          const patch = {
            status: sub?.subscriptionState ?? "SUBSCRIPTION_STATE_EXPIRED",
            expires_at: line?.expiryTime ?? r.expires_at,
            auto_renewing: line?.autoRenewingPlan?.autoRenewEnabled ?? null,
            last_verified_at: new Date().toISOString(),
          };
          await db.from("play_subscriptions").update(patch).eq("id", r.id);
          Object.assign(r, patch);
        } catch {
          /* keep stored state; expiry date still bounds access */
        }
      }
    }

    const tier = pickTier(rows);
    const active = rows.find((r) => pickTier([r]) === tier && tier !== "free") as (Row & { base_plan_id?: string; auto_renewing?: boolean }) | undefined;
    return {
      tier,
      features: featuresForTier(tier),
      expiresAt: active?.expires_at ?? null,
      basePlanId: active?.base_plan_id ?? null,
      autoRenewing: active?.auto_renewing ?? null,
      billingConfigured: play.playConfigured(),
      accountId: await play.accountIdFor(context.userId),
    };
  });

export const verifyPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ productId: z.string().max(64), purchaseToken: z.string().min(10).max(4096) }).parse(d))
  .handler(async ({ data, context }) => verifyAndStore(context.userId, data.productId, data.purchaseToken));

export const restorePurchases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ purchases: z.array(z.object({ productId: z.string().max(64), purchaseToken: z.string().min(10).max(4096) })).max(10) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let restored = 0;
    for (const p of data.purchases) {
      try {
        const r = await verifyAndStore(context.userId, p.productId, p.purchaseToken);
        if (!r.pending) restored++;
      } catch {
        /* skip purchases that fail verification */
      }
    }
    return { restored };
  });
