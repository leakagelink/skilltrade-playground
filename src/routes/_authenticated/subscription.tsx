import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, RefreshCw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { SubscriptionPlanCard } from "@/components/SubscriptionPlanCard";
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
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState(false);

  async function fetchOffers() {
    setOffersLoading(true);
    setOffersError(false);
    try {
      setOffers(await loadOffers());
    } catch (e) {
      setOffersError(true);
      toast.error((e as Error).message);
    } finally {
      setOffersLoading(false);
    }
  }

  useEffect(() => {
    void billingAvailable().then(async (ok) => {
      setNative(ok);
      if (ok) await fetchOffers();
      else setOffersLoading(false);
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
      <AppHeader title="Plans & pricing" back="/profile" />
      <div className="space-y-6 px-4 py-6 sm:px-6">
        <header className="space-y-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-primary"><ShieldCheck className="size-4" /> GOOGLE PLAY SUBSCRIPTIONS</p>
          <h1 className="text-3xl leading-tight tracking-normal">Your practice.<br />Your plan.</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">Enjoy ad-free practice with Pro or Elite, or support TradeVirt with Basic.</p>
        </header>
        <section className="flex items-center justify-between gap-3 border-y py-4">
          <div><p className="text-xs text-muted-foreground">Your current plan</p>
          <p className="mt-1 text-base font-bold capitalize">{ent.isPending ? "Loading…" : ent.isError ? "Could not verify" : tier}</p>
          {ent.data?.expiresAt ? (
            <p className="text-xs text-muted-foreground">
              {ent.data.autoRenewing ? "Renews" : "Ends"} on {new Date(ent.data.expiresAt).toLocaleDateString()}
            </p>
          ) : null}</div>
          {ent.data ? <span className="flex items-center gap-1.5 rounded-full bg-bull/10 px-3 py-1.5 text-xs font-medium text-bull"><Check className="size-3.5" /> {ent.data.adFree ? "Ad-free" : "With ads"}</span> : null}
        </section>

        <div className="grid grid-cols-2 gap-1 rounded-xl border bg-muted p-1" role="tablist" aria-label="Billing period">
          {(["monthly", "yearly"] as const).map((p) => (
            <Button
              variant="ghost"
              key={p}
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              className={`h-11 rounded-lg text-sm font-semibold capitalize hover:bg-background hover:text-foreground ${period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {p}
            </Button>
          ))}
        </div>

        {native === false ? (
          <p className="border-l-2 border-primary pl-3 text-sm leading-relaxed text-muted-foreground">Open TradeVirt on Android to see local prices and subscribe through Google Play.</p>
        ) : null}
        {native && configured === false ? (
          <p className="surface-card p-4 text-sm text-muted-foreground">Subscriptions are not available yet. Please check back soon.</p>
        ) : null}
        {offersError ? <div role="alert" className="flex items-center justify-between gap-2 text-sm text-muted-foreground"><span>Google Play prices could not load.</span><Button variant="outline" onClick={() => void fetchOffers()} disabled={offersLoading}><RefreshCw /> Retry</Button></div> : null}

        {PLANS.map((plan) => {
          const offer = offers.find((o) => o.productId === plan.productId && o.basePlanId === period);
          const isCurrent = tier === plan.tier;
          return (
            <SubscriptionPlanCard key={plan.productId} plan={plan} price={offer?.price} period={period} current={isCurrent}
              disabled={!native || !configured || !offer || !ent.data || ent.isError || isCurrent || busy !== null}
              processing={busy === plan.productId} onSubscribe={() => void subscribe(plan.productId)}
              priceState={offersLoading ? "Loading Google Play price…" : native ? "Currently unavailable" : "Prices available on Android"} />
          );
        })}

        <div className="grid gap-2 border-t pt-5">
          <Button variant="outline" className="h-11 rounded-xl" disabled={!native || busy !== null} onClick={doRestore}><RefreshCw />
            {busy === "restore" ? "Restoring…" : "Restore purchases"}
          </Button>
          <Button variant="ghost" className="h-11 rounded-xl" onClick={() => void openManage()}><SlidersHorizontal />
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
