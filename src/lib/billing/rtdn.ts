/** Pure, browser-safe helpers for Google Play RTDN handling (testable). */
export type Rtdn = {
  packageName?: string;
  testNotification?: unknown;
  subscriptionNotification?: { notificationType?: number; purchaseToken?: string; subscriptionId?: string };
  voidedPurchaseNotification?: { purchaseToken?: string; productType?: number };
};

export function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Decodes a Pub/Sub push body. Returns null when malformed. */
export function parseRtdnPush(body: unknown): Rtdn | null {
  try {
    const data = (body as { message?: { data?: unknown } })?.message?.data;
    if (typeof data !== "string" || !data) return null;
    const parsed = JSON.parse(atob(data)) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Rtdn) : null;
  } catch {
    return null;
  }
}

export function rtdnToken(msg: Rtdn): string | null {
  return msg.subscriptionNotification?.purchaseToken ?? msg.voidedPurchaseNotification?.purchaseToken ?? null;
}

type Sub = {
  subscriptionState: string;
  latestOrderId?: string;
  lineItems?: { productId: string; expiryTime?: string; autoRenewingPlan?: { autoRenewEnabled?: boolean } }[];
} | null;

/** Builds the authoritative row update from Google's re-queried state (never from the payload). */
export function rtdnPatch(sub: Sub, voided: boolean, row: { product_id: string; expires_at: string | null }, now = new Date()) {
  const line = sub?.lineItems?.find((l) => l.productId === row.product_id);
  const status = !sub || voided ? "SUBSCRIPTION_STATE_EXPIRED" : sub.subscriptionState;
  return {
    status,
    expires_at: voided ? now.toISOString() : (line?.expiryTime ?? row.expires_at),
    auto_renewing: line?.autoRenewingPlan?.autoRenewEnabled ?? null,
    latest_order_id: sub?.latestOrderId ?? null,
    last_verified_at: now.toISOString(),
  };
}
