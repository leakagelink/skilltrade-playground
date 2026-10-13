import { describe, expect, it } from "vitest";
import { mapStoreOffers } from "./native-billing";

const ids = ["tradevirt_basic", "tradevirt_pro", "tradevirt_elite"];
const row = (product: string, base: string, extra: Record<string, unknown> = {}) => ({
  planIdentifier: product, identifier: base, priceString: `${product}-${base}`, offerToken: `tok-${product}-${base}`, offerId: null, ...extra,
});

describe("mapStoreOffers", () => {
  it("maps planIdentifier→productId and identifier→basePlanId for all 6 plans", () => {
    const { offers, diagnostics } = mapStoreOffers(ids.flatMap((p) => [row(p, "monthly"), row(p, "yearly")]));
    expect(offers).toHaveLength(6);
    for (const p of ids) for (const b of ["monthly", "yearly"])
      expect(offers).toContainEqual({ productId: p, basePlanId: b, price: `${p}-${b}`, offerToken: `tok-${p}-${b}` });
    expect(diagnostics).toEqual({ missingProducts: [], missingBasePlans: [], noRegularOffer: [] });
  });

  it("prefers the regular offer over an intro offer regardless of order", () => {
    const { offers } = mapStoreOffers([
      row("tradevirt_pro", "monthly", { offerId: "intro", priceString: "₹1", offerToken: "intro-tok" }),
      row("tradevirt_pro", "monthly"),
    ]);
    expect(offers).toEqual([{ productId: "tradevirt_pro", basePlanId: "monthly", price: "tradevirt_pro-monthly", offerToken: "tok-tradevirt_pro-monthly" }]);
  });

  it("does not pick a promo when no regular offer exists", () => {
    const { offers, diagnostics } = mapStoreOffers([row("tradevirt_pro", "monthly", { offerId: "intro" })]);
    expect(offers).toEqual([]);
    expect(diagnostics.noRegularOffer).toEqual(["tradevirt_pro/monthly"]);
  });

  it("reports missing products and base plans", () => {
    const { diagnostics } = mapStoreOffers([row("tradevirt_pro", "monthly")]);
    expect(diagnostics.missingProducts).toEqual(["tradevirt_basic", "tradevirt_elite"]);
    expect(diagnostics.missingBasePlans).toEqual(["tradevirt_pro/yearly"]);
  });

  it("handles an empty result and ignores unknown products", () => {
    expect(mapStoreOffers([]).diagnostics.missingProducts).toEqual(ids);
    expect(mapStoreOffers([row("other", "monthly")]).offers).toEqual([]);
  });

  it("does not use the old swapped mapping", () => {
    expect(mapStoreOffers([{ ...row("x", "y"), planIdentifier: "monthly", identifier: "tradevirt_pro" }]).offers).toEqual([]);
  });
});
