import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { updateProfileSettings } from "@/lib/trading.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, LineChart, Rocket } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome — TradeVirt" },
      { name: "description", content: "Get started with simulated paper trading on TradeVirt." },
      { property: "og:title", content: "Welcome to TradeVirt" },
      { property: "og:description", content: "Practice trading using virtual money. No real money is involved." },
    ],
  }),
  component: Onboarding,
});

const STEPS = [
  {
    icon: GraduationCap,
    title: "Welcome to Paper Trading",
    body: "Practice trading using virtual money. No real money is involved.",
  },
  {
    icon: LineChart,
    title: "Build Your Trading Skill",
    body: "Your performance is measured using consistency, risk management and trading discipline.",
  },
  {
    icon: Rocket,
    title: "Start Your Trading Journey",
    body: "You start with 5 Trading Credits and a $100,000 virtual balance. Claim 3 more credits every day.",
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const save = useServerFn(updateProfileSettings);
  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  async function finish() {
    if (!accepted) {
      toast.error("Please confirm you understand this is a simulation.");
      return;
    }
    setSaving(true);
    try {
      await save({ data: { onboardingCompleted: true } });
      navigate({ to: "/home", replace: true });
    } catch {
      toast.error("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col gradient-hero px-6 py-12">
      <div className="flex gap-1.5">
        {STEPS.map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`} />
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-primary/15 text-primary">
          <current.icon className="size-9" />
        </div>
        <h1 className="mt-8 text-2xl font-bold">{current.title}</h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">{current.body}</p>
      </div>

      {isLast ? (
        <label className="mb-5 flex items-start gap-3 rounded-xl bg-secondary/60 p-4 text-left">
          <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" />
          <span className="text-xs leading-relaxed text-muted-foreground">
            I understand that this app is for simulated trading and educational purposes only.
          </span>
        </label>
      ) : null}

      <Button
        size="lg"
        className="h-12 w-full rounded-xl text-base font-semibold"
        disabled={saving}
        onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
      >
        {isLast ? "Start Trading" : "Continue"}
      </Button>
    </main>
  );
}
