import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { getEntitlement, restorePurchases, verifyPurchase } from "@/lib/billing.functions";
import { PLANS, type BasePlanId } from "@/lib/billing/plans";
import { entitlementKey } from "@/lib/billing/entitlement-cache";
import { billingAvailable, currentPurchases, loadOffers, openManage, purchase, type StoreOffer } from "@/lib/billing/native-billing";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({
    meta: [
      { title: "Plans — TradeVirt" },
      { name: "description", content: "Choose a TradeVirt Basic, Pro or Elite subscription. Pro and Elite are ad-free." },
      { property: "og:title", content: "Plans — TradeVirt" },
      { property: "og:description", content: "TradeVirt subscription plans via Google Play." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const qc = useQueryClient();
  const loadEnt = useServerFn(getEntitlement);
  const verify = useServerFn(verifyPurchase);
  const restore = useServerFn(restorePurchases);
  const { user } = Route.useRouteContext();
  const ent = useQuery({ queryKey: entitlementKey(user?.id), queryFn: () => loadEnt(), enabled: !!user?.id });
  const [period, setPeriod] = useState<BasePlanId>("monthly");
  const [native, setNative] = useState<boolean | null>(null);
  const [offers, setOffers] = useState<StoreOffer[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void billingAvailable().then(async (ok) => {
      setNative(ok);
      if (ok)
        setOffers(
          await loadOffers().catch((e: Error) => {
            toast.error(e.message);
            return [];
          }),
        );
    });
  }, []);

  const refresh = () => qc.invalidateQueries({ queryKey: ["entitlement"] }).then(() => qc.invalidateQueries({ queryKey: ["ad-status"] }));

  async function subscribe(productId: string) {
    const offer = offers.find((o) => o.productId === productId && o.basePlanId === period);
    if (!offer || !ent.data) return;
    setBusy(productId);
    try {
      const token = await purchase(productId, offer.storeBasePlanId, ent.data.accountId, offer.offerToken);
      if (!token) {
        toast.message("Purchase cancelled.");
        return;
      }
      const r = await verify({ data: { productId, purchaseToken: token } });
      if (r.pending) toast.message("Payment is pending. Your plan will activate once Google Play confirms it.");
      else toast.success("Subscription active. Thank you!");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message || "Purchase failed. You were not charged twice — try Restore Purchases.");
    } finally {
      setBusy(null);
    }
  }

  async function doRestore() {
    setBusy("restore");
    try {
      const purchases = await currentPurchases();
      if (!purchases.length) {
        toast.message("No subscriptions found on this Google account.");
        return;
      }
      const r = await restore({ data: { purchases } });
      toast[r.restored ? "success" : "message"](r.restored ? "Subscription restored." : "No active subscription could be confirmed.");
      await refresh();
    } catch {
      toast.error("Could not restore purchases.");
    } finally {
      setBusy(null);
    }
  }

  const tier = ent.data?.tier ?? "free";
  const configured = ent.data?.billingConfigured;

  return (
    <main>
      <AppHeader title="Plans" back="/settings" />
      <div className="space-y-5 p-5">
        <section className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Current plan</p>
          <p className="text-lg font-bold capitalize">{ent.isPending ? "Loading…" : tier}</p>
          {ent.data?.expiresAt ? (
            <p className="text-xs text-muted-foreground">
              {ent.data.autoRenewing ? "Renews" : "Ends"} on {new Date(ent.data.expiresAt).toLocaleDateString()}
            </p>
          ) : null}
        </section>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1" role="tablist">
          {(["monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              className={`min-h-11 rounded-lg text-sm font-semibold capitalize ${period === p ? "bg-background text-foreground" : "text-muted-foreground"}`}
            >
              {p}
            </button>
          ))}
        </div>

        {native === false ? (
          <p className="surface-card p-4 text-sm text-muted-foreground">Subscriptions can be bought in the TradeVirt Android app from Google Play.</p>
        ) : null}
        {native && configured === false ? (
          <p className="surface-card p-4 text-sm text-muted-foreground">Subscriptions are not available yet. Please check back soon.</p>
        ) : null}

        {PLANS.map((plan) => {
          const offer = offers.find((o) => o.productId === plan.productId && o.basePlanId === period);
          const isCurrent = tier === plan.tier;
          return (
            <section key={plan.productId} className="surface-card space-y-3 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-base font-bold">{plan.name}</h2>
                <p className="text-sm font-semibold">
                  {offer ? `${offer.price} / ${period === "monthly" ? "month" : "year"}` : native ? "Unavailable" : ""}
                </p>
              </div>
              {plan.adFree ? <span className="inline-block rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">Ad-free</span> : null}
              <ul className="space-y-1.5">
                {plan.benefits.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-primary" /> {b}
                  </li>
                ))}
              </ul>
              <Button
                className="h-11 w-full rounded-xl"
                disabled={!native || !configured || !offer || isCurrent || busy !== null}
                onClick={() => subscribe(plan.productId)}
              >
                {isCurrent ? "Current plan" : busy === plan.productId ? "Processing…" : "Subscribe"}
              </Button>
            </section>
          );
        })}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11 rounded-xl" disabled={!native || busy !== null} onClick={doRestore}>
            {busy === "restore" ? "Restoring…" : "Restore purchases"}
          </Button>
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => void openManage()}>
            Manage subscription
          </Button>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Subscriptions are billed through Google Play and renew automatically at the end of each period unless cancelled at least 24 hours
          before renewal. You can cancel anytime in Google Play → Subscriptions; access continues until the end of the paid period. Prices are
          shown by Google Play in your local currency. Subscriptions do not add virtual balance and TradeVirt remains a practice simulator with
          no real money trading.
        </p>
        <p className="text-xs text-muted-foreground">
          <Link to="/legal/terms" className="underline">Terms of Service</Link> ·{" "}
          <Link to="/legal/privacy" className="underline">Privacy Policy</Link>
        </p>
      </div>
    </main>
  );
}
