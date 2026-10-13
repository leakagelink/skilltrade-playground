import { ArrowRight, Check, Crown, ShieldCheck, Sparkles, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/billing/plans";
import { BILLING_DETAILS, PLAN_DETAILS } from "@/lib/billing/plan-presentation";

type Props = {
  plan: (typeof PLANS)[number];
  price: string | undefined;
  period: "monthly" | "yearly";
  current: boolean;
  disabled: boolean;
  processing: boolean;
  priceState: string;
  onSubscribe: () => void;
};

export function SubscriptionPlanCard({ plan, price, period, current, disabled, processing, priceState, onSubscribe }: Props) {
  const featured = plan.tier === "pro";
  const Icon = plan.tier === "basic" ? Zap : featured ? Sparkles : Crown;
  const detail = PLAN_DETAILS[plan.tier];
  const tone = plan.tier === "basic" ? "bg-secondary text-secondary-foreground" : featured ? "bg-primary/10 text-primary" : "bg-warning/15 text-foreground";

  return (
    <section aria-label={`${plan.name} plan`} className={`relative overflow-hidden rounded-2xl border bg-surface shadow-card motion-safe:animate-rise ${featured ? "border-primary" : plan.tier === "elite" ? "border-warning/60" : "border-border"}`}>
      {featured ? <div className="flex items-center justify-center gap-2 bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground"><Sparkles className="size-3.5" /> Personal reports + ad-free practice</div> : null}
      {plan.tier === "elite" ? <div className="flex items-center justify-center gap-2 bg-warning/15 px-5 py-2 text-xs font-semibold text-foreground"><Crown className="size-3.5" /> Everything in Pro + stress lab</div> : null}
      <div className="space-y-6 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="size-6" /></div>
            <div><p className="mb-1 text-[10px] font-semibold text-muted-foreground">{detail.label}</p><h2 className="text-2xl tracking-normal">{plan.name}</h2></div>
          </div>
          {current ? <span className="shrink-0 rounded-full bg-bull/10 px-2.5 py-1 text-xs font-semibold text-bull">Your plan</span> : null}
        </div>

        <div><h3 className="text-xl leading-snug tracking-normal">{detail.headline}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail.audience}</p></div>

        <div className="min-h-16">
          {price ? <><p className="break-words font-display text-4xl font-bold leading-tight tracking-normal tabular-nums">{price}</p><p className="mt-1 text-sm text-muted-foreground">per {period === "monthly" ? "month" : "year"} · {BILLING_DETAILS[period].renewal}</p></> : <p className="pt-2 text-sm font-medium text-muted-foreground">{priceState}</p>}
        </div>

        <div className={`flex items-center gap-2 border-y py-3 text-sm font-semibold ${plan.adFree ? "text-bull" : "text-muted-foreground"}`}>
          {plan.adFree ? <ShieldCheck className="size-5 shrink-0" /> : <Zap className="size-5 shrink-0" />}
          {plan.adFree ? "Ad-free across TradeVirt" : "Risk planning, with ads"}
        </div>
        <ul className="space-y-3">
          {detail.highlights.map((benefit) => <li key={benefit} className="flex items-start gap-2.5 text-sm leading-relaxed"><Check className="mt-0.5 size-4 shrink-0 text-bull" /><span>{benefit}</span></li>)}
        </ul>
        <div className="border-t pt-4"><h3 className="text-sm tracking-normal">Why choose {plan.name}?</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail.reason}</p></div>
        <p className="flex items-start gap-2 border-t border-dashed pt-4 text-xs leading-relaxed text-muted-foreground"><X className="mt-0.5 size-3.5 shrink-0" />{detail.limitation}</p>
        <Button variant={featured ? "default" : "outline"} className={`min-h-12 h-auto w-full whitespace-normal rounded-xl py-3 font-semibold ${plan.tier === "elite" ? "border-warning/60 bg-warning/10 hover:bg-warning/20 hover:text-foreground" : !featured ? "bg-secondary hover:bg-muted hover:text-foreground" : ""}`} disabled={disabled} onClick={onSubscribe}>
          {current ? "Current plan" : processing ? "Processing…" : detail.action}{!current && !processing ? <ArrowRight /> : null}
        </Button>
      </div>
    </section>
  );
}