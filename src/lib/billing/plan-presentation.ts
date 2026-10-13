import type { BasePlanId, Tier } from "./plans";

/** Describes existing access, not additional entitlements or promised future features. */
export const PLAN_DETAILS = {
  basic: {
    label: "SUPPORTER",
    headline: "Support the app you practice with",
    audience: "For learners who want to support TradeVirt and are happy to keep seeing ads.",
    reason: "Choose Basic to contribute to TradeVirt's development. It is a support subscription, not an unlock for extra trading tools.",
    highlights: ["Support TradeVirt development", "Keep access to the existing practice tools", "Monthly or yearly support through Google Play"],
    limitation: "Ads remain enabled. Practice features are also available on Free; Basic does not add exclusive tools.",
    action: "Support with Basic",
  },
  pro: {
    label: "AD-FREE PRACTICE",
    headline: "Less interruption. More focus.",
    audience: "For regular learners who want to use TradeVirt without ads.",
    reason: "Choose Pro for ad-free practice. It is the lower-priced ad-free tier; you do not need Elite for the same feature access.",
    highlights: ["Remove ads across TradeVirt", "Use the existing practice tools without ad interruptions", "Ad-free access for your verified paid period"],
    limitation: "No extra virtual funds, higher analysis limits or exclusive trading tools are included.",
    action: "Go ad-free with Pro",
  },
  elite: {
    label: "PREMIUM SUPPORTER",
    headline: "Ad-free, with a bigger contribution",
    audience: "For learners who enjoy TradeVirt and want to contribute more to its development.",
    reason: "Choose Elite if you want to give more support. If your goal is only to remove ads, Pro provides the same ad-free access.",
    highlights: ["Everything in Pro's ad-free access", "A higher contribution to TradeVirt development", "Keep all existing practice tools"],
    limitation: "Same feature access as Pro. Elite does not include priority service, exclusive tools or additional analysis limits.",
    action: "Support more with Elite",
  },
} satisfies Record<Exclude<Tier, "free">, { label: string; headline: string; audience: string; reason: string; highlights: string[]; limitation: string; action: string }>;

export const BILLING_DETAILS: Record<BasePlanId, { title: string; description: string; renewal: string }> = {
  monthly: { title: "Monthly · a shorter commitment", description: "Pay for one month at a time. Your selected plan's benefits stay the same; the subscription renews every month unless cancelled.", renewal: "One-month billing period" },
  yearly: { title: "Yearly · one annual payment", description: "Pay the full yearly price upfront for a year of your selected plan. The subscription renews annually unless cancelled. Yearly does not unlock extra features.", renewal: "Full year paid upfront" },
};