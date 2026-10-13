import { ArrowRight, Check, Crown, ShieldCheck, Sparkles, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/billing/plans";

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
  const description = plan.tier === "basic" ? "For everyday practice" : featured ? "Practice without interruptions" : "For our biggest supporters";

  return (
    <section aria-label={`${plan.name} plan`} className={`relative overflow-hidden rounded-2xl border bg-surface shadow-card motion-safe:animate-rise ${featured ? "border-primary" : "border-border"}`}>
      {featured ? <div className="flex items-center justify-center gap-2 bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground"><Sparkles className="size-3.5" /> Recommended for ad-free practice</div> : null}
      <div className="space-y-6 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${plan.tier === "elite" ? "bg-bull/10 text-bull" : "bg-primary/10 text-primary"}`}><Icon className="size-6" /></div>
            <div><h2 className="text-2xl tracking-normal">{plan.name}</h2><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
          </div>
          {current ? <span className="shrink-0 rounded-full bg-bull/10 px-2.5 py-1 text-xs font-semibold text-bull">Your plan</span> : null}
        </div>

        <div className="min-h-16">
          {price ? <><p className="break-words font-display text-4xl font-bold leading-tight tracking-normal tabular-nums">{price}</p><p className="mt-1 text-sm text-muted-foreground">per {period === "monthly" ? "month" : "year"} · billed {period}</p></> : <p className="pt-2 text-sm font-medium text-muted-foreground">{priceState}</p>}
        </div>

        <div className={`flex items-center gap-2 border-y py-3 text-sm font-semibold ${plan.adFree ? "text-bull" : "text-muted-foreground"}`}>
          {plan.adFree ? <ShieldCheck className="size-5 shrink-0" /> : <Zap className="size-5 shrink-0" />}
          {plan.adFree ? "Ad-free across TradeVirt" : "Full access, with ads"}
        </div>
        <ul className="space-y-3">
          {plan.benefits.map((benefit) => <li key={benefit} className="flex items-start gap-2.5 text-sm leading-relaxed"><Check className="mt-0.5 size-4 shrink-0 text-bull" /><span>{benefit}</span></li>)}
        </ul>
        {!plan.adFree ? <div className="border-t border-dashed pt-4"><p className="mb-2 text-xs font-semibold text-muted-foreground">NOT INCLUDED</p><p className="flex items-center gap-2 text-sm text-muted-foreground"><X className="size-4 shrink-0" /> Ad-free experience</p><p className="mt-1 pl-6 text-xs text-muted-foreground">Available with Pro and Elite</p></div> : null}
        {plan.tier === "elite" ? <p className="border-t border-dashed pt-4 text-xs leading-relaxed text-muted-foreground">Same ad-free access as Pro, with a higher level of support for TradeVirt.</p> : null}
        <Button variant={featured ? "default" : "outline"} className={`h-12 w-full rounded-xl font-semibold ${!featured ? "border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary" : ""}`} disabled={disabled} onClick={onSubscribe}>
          {current ? "Current plan" : processing ? "Processing…" : `Choose ${plan.name}`}{!current && !processing ? <ArrowRight /> : null}
        </Button>
      </div>
    </section>
  );
}