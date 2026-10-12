/** Browser-safe bridge to Google Play Billing. Every call is a no-op on the web. */
import { PLANS, type BasePlanId } from "./plans";

type Mod = typeof import("@capgo/native-purchases");

async function load(): Promise<Mod | null> {
  if (typeof window === "undefined") return null;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.getPlatform() !== "android") return null;
    const mod = await import("@capgo/native-purchases");
    const { isBillingSupported } = await mod.NativePurchases.isBillingSupported();
    return isBillingSupported ? mod : null;
  } catch {
    return null;
  }
}

export type StoreOffer = { productId: string; basePlanId: string; price: string; offerToken?: string | undefined };

export async function billingAvailable(): Promise<boolean> {
  return (await load()) !== null;
}

export async function loadOffers(): Promise<StoreOffer[]> {
  const mod = await load();
  if (!mod) return [];
  const { products } = await mod.NativePurchases.getProducts({
    productIdentifiers: PLANS.map((p) => p.productId),
    productType: mod.PURCHASE_TYPE.SUBS,
  });
  return products.map((p) => ({
    productId: p.identifier,
    basePlanId: (p as { planIdentifier?: string }).planIdentifier ?? "",
    price: p.priceString,
    offerToken: (p as { offerToken?: string }).offerToken,
  }));
}

/** Launches the real Google Play purchase sheet. Returns the purchase token or null if cancelled. */
export async function purchase(productId: string, basePlanId: BasePlanId, accountId: string, offerToken?: string): Promise<string | null> {
  const mod = await load();
  if (!mod) throw new Error("Subscriptions are available in the TradeVirt Android app.");
  try {
    const tx = await mod.NativePurchases.purchaseProduct({
      productIdentifier: productId,
      planIdentifier: basePlanId,
      ...(offerToken ? { offerToken } : {}),
      productType: mod.PURCHASE_TYPE.SUBS,
      appAccountToken: accountId,
      // The server acknowledges only after verifying with Google.
      autoAcknowledgePurchases: false,
    });
    return tx.purchaseToken ?? null;
  } catch (e) {
    const msg = String((e as Error)?.message ?? e).toLowerCase();
    if (msg.includes("cancel")) return null;
    throw e;
  }
}

export async function currentPurchases(): Promise<{ productId: string; purchaseToken: string }[]> {
  const mod = await load();
  if (!mod) return [];
  const { purchases } = await mod.NativePurchases.getPurchases({ productType: mod.PURCHASE_TYPE.SUBS });
  return purchases
    .filter((p) => p.purchaseToken)
    .map((p) => ({ productId: p.productIdentifier, purchaseToken: p.purchaseToken as string }));
}

export async function openManage(): Promise<void> {
  const mod = await load();
  if (mod) return mod.NativePurchases.manageSubscriptions();
  window.open("https://play.google.com/store/account/subscriptions?package=online.tradevirt.app", "_blank", "noopener");
}
