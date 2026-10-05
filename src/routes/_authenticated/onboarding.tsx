import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { updateProfileSettings } from "@/lib/trading.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, LineChart, Rocket } from "lucide-react";
import { toast } from "sonner";
import {
  CAPITAL_RANGES,
  GOALS,
  MARKETS,
  MODES,
  useSavePersonalization,
  type CapitalRange,
  type LearningGoal,
  type LearningMode,
  type Market,
} from "@/lib/personalization";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/onboarding")({
  validateSearch: (s: Record<string, unknown>): { personalize?: boolean } =>
    s["personalize"] === true || s["personalize"] === "true" ? { personalize: true } : {},
  head: () => ({
    meta: [
      { title: "Welcome — TradeVirt" },
      { name: "description", content: "Get started with simulated paper trading on TradeVirt." },
      { property: "og:title", content: "Welcome to TradeVirt" },
      { property: "og:description", content: "Practice trading using virtual money. No real money is involved." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

const INTRO = [
  { icon: GraduationCap, title: "Welcome to Paper Trading", body: "Practice trading using virtual money. No real money is involved." },
  { icon: LineChart, title: "Build Your Trading Skill", body: "Your performance is measured using consistency, risk management and trading discipline." },
  { icon: Rocket, title: "Start Your Trading Journey", body: "You start with 5 Trading Credits and a $100,000 virtual balance. Claim 3 more credits every day." },
];

type StepKey = "intro0" | "intro1" | "intro2" | "about" | "experience" | "goal" | "capital";

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left text-sm transition ${active ? "border-primary bg-primary/10 font-semibold" : "border-border bg-secondary/40"}`}
    >
      {children}
    </button>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const { personalize } = Route.useSearch();
  const steps: StepKey[] = personalize
    ? ["about", "experience", "goal", "capital"]
    : ["intro0", "intro1", "intro2", "about", "experience", "goal", "capital"];
  const [i, setI] = useState(0);
  const [accepted, setAccepted] = useState(!!personalize);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [experience, setExperience] = useState<LearningMode>("beginner");
  const [mode, setMode] = useState<LearningMode | null>(null);
  const [goal, setGoal] = useState<LearningGoal | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [capital, setCapital] = useState<CapitalRange | null>(null);
  const saveProfile = useServerFn(updateProfileSettings);
  const savePers = useSavePersonalization();
  const key = steps[i]!;
  const isLast = i === steps.length - 1;

  function next() {
    if (key === "about") {
      const m = mobile.trim();
      if (m && !/^\+?[0-9 ]{6,20}$/.test(m)) {
        toast.error("Enter a valid mobile number, or leave it empty.");
        return;
      }
    }
    if (isLast) void finish();
    else setI((n) => n + 1);
  }

  async function finish() {
    if (!accepted) {
      toast.error("Please confirm you understand this is a simulation.");
      return;
    }
    setSaving(true);
    try {
      await savePers.mutateAsync({
        full_name: fullName.trim() || null,
        mobile: mobile.trim() || null,
        experience_level: experience,
        active_learning_mode: mode ?? experience,
        learning_goal: goal,
        preferred_markets: markets,
        hypothetical_starting_capital_range: capital,
        personalization_completed: true,
      });
      if (!personalize) await saveProfile({ data: { onboardingCompleted: true } });
      void trackEvent("onboarding_personalized", { experience, mode: mode ?? experience });
      navigate({ to: "/home", replace: true });
    } catch {
      toast.error("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  async function skipPersonalization() {
    if (personalize) {
      navigate({ to: "/home", replace: true });
      return;
    }
    // Jump to last step so the simulation confirmation is still required.
    setI(steps.length - 1);
  }

  const intro = key.startsWith("intro") ? INTRO[Number(key.slice(5))]! : null;

  return (
    <main className="flex min-h-screen flex-col gradient-hero px-6 py-12">
      <div className="flex gap-1.5">
        {steps.map((_, n) => (
          <span key={n} className={`h-1 flex-1 rounded-full ${n <= i ? "bg-primary" : "bg-secondary"}`} />
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-center py-8">
        {intro ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex size-20 items-center justify-center rounded-3xl bg-primary/15 text-primary">
              <intro.icon className="size-9" />
            </div>
            <h1 className="mt-8 text-2xl font-bold">{intro.title}</h1>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">{intro.body}</p>
          </div>
        ) : null}

        {key === "about" ? (
          <div className="mx-auto w-full max-w-sm space-y-4">
            <h1 className="text-2xl font-bold">A little about you</h1>
            <p className="text-xs text-muted-foreground">
              Kept private. Your username is what others see on leaderboards and challenges.
            </p>
            <div>
              <Label htmlFor="ob-name">Full name (optional)</Label>
              <Input id="ob-name" value={fullName} maxLength={80} onChange={(e) => setFullName(e.target.value)} className="mt-1.5 h-12 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="ob-mobile">Mobile number (optional)</Label>
              <Input id="ob-mobile" type="tel" inputMode="tel" value={mobile} maxLength={20} placeholder="+91 98765 43210" onChange={(e) => setMobile(e.target.value)} className="mt-1.5 h-12 rounded-xl" />
            </div>
          </div>
        ) : null}

        {key === "experience" ? (
          <div className="mx-auto w-full max-w-sm space-y-3">
            <h1 className="text-2xl font-bold">What's your trading experience?</h1>
            {MODES.map((m) => (
              <Chip key={m.value} active={experience === m.value} onClick={() => setExperience(m.value)}>
                {m.label}
              </Chip>
            ))}
            <p className="pt-2 text-sm font-semibold">Learning mode to start with</p>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <Chip key={m.value} active={(mode ?? experience) === m.value} onClick={() => setMode(m.value)}>
                  <span className="text-xs">{m.label}</span>
                </Chip>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">You can switch modes anytime in Settings. Nothing is locked.</p>
          </div>
        ) : null}

        {key === "goal" ? (
          <div className="mx-auto w-full max-w-sm space-y-3">
            <h1 className="text-2xl font-bold">Your learning goal</h1>
            {GOALS.map((g) => (
              <Chip key={g.value} active={goal === g.value} onClick={() => setGoal(goal === g.value ? null : g.value)}>
                {g.label}
              </Chip>
            ))}
            <p className="pt-2 text-sm font-semibold">Markets you're interested in</p>
            <div className="grid grid-cols-2 gap-2">
              {MARKETS.map((m) => (
                <Chip
                  key={m.value}
                  active={markets.includes(m.value)}
                  onClick={() => setMarkets((cur) => (cur.includes(m.value) ? cur.filter((x) => x !== m.value) : [...cur, m.value]))}
                >
                  <span className="text-xs">{m.label}</span>
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        {key === "capital" ? (
          <div className="mx-auto w-full max-w-sm space-y-3">
            <h1 className="text-xl font-bold">If you ever start real-world trading, what amount would you roughly consider starting with?</h1>
            <p className="text-xs text-muted-foreground">
              Optional and private. Used only to personalize simulated practice — never for advice, recommendations or predictions.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CAPITAL_RANGES.map((c) => (
                <Chip key={c.value} active={capital === c.value} onClick={() => setCapital(capital === c.value ? null : c.value)}>
                  <span className="text-xs">{c.label}</span>
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {isLast && !personalize ? (
        <label className="mb-5 flex items-start gap-3 rounded-xl bg-secondary/60 p-4 text-left">
          <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" />
          <span className="text-xs leading-relaxed text-muted-foreground">
            I understand that this app is for simulated trading and educational purposes only.
          </span>
        </label>
      ) : null}

      <Button size="lg" className="h-12 w-full rounded-xl text-base font-semibold" disabled={saving} onClick={next}>
        {isLast ? (personalize ? "Save" : "Start Trading") : "Continue"}
      </Button>
      {!intro && !isLast ? (
        <Button variant="ghost" className="mt-2 w-full" onClick={skipPersonalization}>
          Skip
        </Button>
      ) : null}
      {key === "capital" ? (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">Tap again to unselect, or just continue to skip.</p>
      ) : null}
    </main>
  );
}
