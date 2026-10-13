import { describe, expect, it } from "vitest";
import { formatStorePrice, mapStoreOffers } from "./native-billing";

const ids = ["tradevirt_basic", "tradevirt_pro", "tradevirt_elite"];
const row = (product: string, base: string, extra: Record<string, unknown> = {}) => ({
  planIdentifier: product, identifier: base, priceString: `${product}-${base}`, offerToken: `tok-${product}-${base}`, offerId: null, ...extra,
});

describe("exact Google Play price display", () => {
  it.each([99, 299, 499])("keeps INR %s instead of rounding up", (price) => {
    const result = formatStorePrice({ price, currencyCode: "INR", priceString: `₹${price + 1}` });
    expect(result).toContain(`${price}.00`);
    expect(result).not.toContain(`${price + 1}.00`);
  });
  it("preserves fractional store amounts", () => {
    expect(formatStorePrice({ price: 99.99, currencyCode: "INR" })).toContain("99.99");
  });
  it("never substitutes a hardcoded target for an actual store price", () => {
    expect(formatStorePrice({ price: 100, currencyCode: "INR", priceString: "₹100.00" })).toContain("100.00");
  });
  it("retains Google's localized price when numeric data is unavailable", () => {
    expect(formatStorePrice({ priceString: "₹99.00" })).toBe("₹99.00");
    expect(formatStorePrice({ price: Number.NaN, currencyCode: "INR", priceString: "₹299.00" })).toBe("₹299.00");
  });
  it("maps the exact numeric price to the selected regular offer", () => {
    expect(mapStoreOffers([row("tradevirt_basic", "basic-monthly", { price: 99, currencyCode: "INR", priceString: "₹100" })]).offers[0]?.price).toContain("99.00");
  });
});

describe("mapStoreOffers", () => {
  it("maps planIdentifier→productId and identifier→basePlanId for all 6 plans", () => {
    const { offers, diagnostics } = mapStoreOffers(ids.flatMap((p) => [row(p, "monthly"), row(p, "yearly")]));
    expect(offers).toHaveLength(6);
    for (const p of ids) for (const b of ["monthly", "yearly"])
      expect(offers).toContainEqual({ productId: p, basePlanId: b, storeBasePlanId: b, price: `${p}-${b}`, offerToken: `tok-${p}-${b}` });
    expect(diagnostics).toEqual({ missingProducts: [], missingBasePlans: [], noRegularOffer: [] });
  });

  it("prefers the regular offer over an intro offer regardless of order", () => {
    const { offers } = mapStoreOffers([
      row("tradevirt_pro", "monthly", { offerId: "intro", priceString: "₹1", offerToken: "intro-tok" }),
      row("tradevirt_pro", "monthly"),
    ]);
    expect(offers).toEqual([{ productId: "tradevirt_pro", basePlanId: "monthly", storeBasePlanId: "monthly", price: "tradevirt_pro-monthly", offerToken: "tok-tradevirt_pro-monthly" }]);
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

  it("maps the live Play catalogue (basic uses basic-monthly) for all 6 combinations", () => {
    const live = [row("tradevirt_basic", "basic-monthly"), row("tradevirt_basic", "yearly"), row("tradevirt_pro", "monthly"), row("tradevirt_pro", "yearly"), row("tradevirt_elite", "monthly"), row("tradevirt_elite", "yearly")];
    const { offers, diagnostics } = mapStoreOffers(live);
    expect(offers).toHaveLength(6);
    expect(offers.find((o) => o.productId === "tradevirt_basic" && o.basePlanId === "monthly")).toMatchObject({ storeBasePlanId: "basic-monthly", offerToken: "tok-tradevirt_basic-basic-monthly" });
    for (const p of ids) for (const b of ["monthly", "yearly"]) expect(offers.some((o) => o.productId === p && o.basePlanId === b)).toBe(true);
    expect(diagnostics.missingBasePlans).toEqual([]);
  });

  it("never reuses a yearly token for monthly", () => {
    const { offers } = mapStoreOffers([row("tradevirt_pro", "yearly")]);
    expect(offers.some((o) => o.basePlanId === "monthly")).toBe(false);
  });
});
