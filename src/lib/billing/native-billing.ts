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

/** basePlanId = app period key ("monthly"/"yearly"); storeBasePlanId = the exact Play Console base-plan ID. */
export type StoreOffer = { productId: string; basePlanId: string; storeBasePlanId: string; price: string; offerToken?: string | undefined };

/**
 * Accepted Play Console base-plan IDs per period. Verified via the Android Publisher API (2026-10-13):
 * tradevirt_basic uses "basic-monthly"; pro/elite use "monthly"; all use "yearly".
 */
export const BASE_PLAN_ALIASES: Record<BasePlanId, (tier: string) => string[]> = {
  monthly: (tier) => ["monthly", `${tier}-monthly`],
  yearly: (tier) => ["yearly", `${tier}-yearly`],
};

export async function billingAvailable(): Promise<boolean> {
  return (await load()) !== null;
}

type RawStoreProduct = { identifier?: string; planIdentifier?: string; priceString?: string; price?: number; currencyCode?: string; offerToken?: string; offerId?: string | null };

/** Preserve the store amount, including currency decimals; never round to a whole amount. */
export function formatStorePrice(product: Pick<RawStoreProduct, "price" | "currencyCode" | "priceString">): string {
  if (typeof product.price === "number" && Number.isFinite(product.price) && product.price >= 0 && product.currencyCode && /^[A-Z]{3}$/.test(product.currencyCode)) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: product.currencyCode, minimumFractionDigits: 0 }).format(product.price);
    } catch {
      // Retain Google's localized string if this device cannot format the currency.
    }
  }
  return product.priceString ?? "";
}

export type OfferDiagnostics = {
  missingProducts: string[];
  missingBasePlans: string[];
  /** Base plans that only had promotional offers (no regular base offer). */
  noRegularOffer: string[];
};

/**
 * Maps @capgo/native-purchases 8.9.2 Android subscription results.
 * Plugin shape (NativePurchasesPlugin.java getProducts): `planIdentifier` = Play product ID,
 * `identifier` = base plan ID, one entry per offer; `offerId` is null for the regular base offer.
 * Only the regular offer is used, so an intro/trial price is never shown as the normal price.
 */
export function mapStoreOffers(products: RawStoreProduct[]): { offers: StoreOffer[]; diagnostics: OfferDiagnostics } {
  const offers: StoreOffer[] = [];
  const diagnostics: OfferDiagnostics = { missingProducts: [], missingBasePlans: [], noRegularOffer: [] };
  for (const plan of PLANS) {
    const forProduct = products.filter((p) => p.planIdentifier === plan.productId);
    if (!forProduct.length) {
      diagnostics.missingProducts.push(plan.productId);
      continue;
    }
    for (const base of BASE_PLANS) {
      const aliases = BASE_PLAN_ALIASES[base](plan.tier);
      const forBase = forProduct.filter((p) => !!p.identifier && aliases.includes(p.identifier));
      if (!forBase.length) {
        diagnostics.missingBasePlans.push(`${plan.productId}/${base}`);
        continue;
      }
      const regular = forBase.find((p) => !p.offerId && p.offerToken && p.priceString);
      if (!regular) {
        diagnostics.noRegularOffer.push(`${plan.productId}/${base}`);
        continue;
      }
      offers.push({ productId: plan.productId, basePlanId: base, storeBasePlanId: regular.identifier as string, price: formatStorePrice(regular), offerToken: regular.offerToken });
    }
  }
  return { offers, diagnostics };
}

const BASE_PLANS: BasePlanId[] = ["monthly", "yearly"];

/** Throws on billing query failure (callers must surface it); logs non-sensitive gaps only. */
export async function loadOffers(): Promise<StoreOffer[]> {
  const mod = await load();
  if (!mod) return [];
  let products: RawStoreProduct[];
  try {
    ({ products } = await mod.NativePurchases.getProducts({
      productIdentifiers: PLANS.map((p) => p.productId),
      productType: mod.PURCHASE_TYPE.SUBS,
    }));
  } catch (e) {
    console.error("[billing] getProducts failed:", String((e as Error)?.message ?? e).slice(0, 200));
    throw new Error("Could not load subscription plans from Google Play.");
  }
  const { offers, diagnostics } = mapStoreOffers(products ?? []);
  // Non-sensitive: product/base-plan IDs and whether a regular offer exists. Never logs tokens.
  console.info("[billing] store offers", (products ?? []).map((p) => `${p.planIdentifier}/${p.identifier}/${p.offerId ?? "base"}`));
  console.info("[billing] selected", offers.map((o) => `${o.productId}/${o.basePlanId}->${o.storeBasePlanId}`));
  if (!products?.length) console.warn("[billing] Google Play returned no subscription products.");
  else if (diagnostics.missingProducts.length || diagnostics.missingBasePlans.length || diagnostics.noRegularOffer.length)
    console.warn("[billing] incomplete plan catalogue", diagnostics);
  return offers;
}

/** Launches the real Google Play purchase sheet. Returns the purchase token or null if cancelled. */
export async function purchase(productId: string, basePlanId: string, accountId: string, offerToken?: string): Promise<string | null> {
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
