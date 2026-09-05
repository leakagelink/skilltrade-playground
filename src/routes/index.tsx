import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CandlestickChart, Loader2, ShieldCheck, Target, Trophy } from "lucide-react";
import { SimulationBadge } from "@/components/Disclaimer";
import { BrandLogo, BrandMark } from "@/components/BrandLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TradeVirt — Practice Trading. Build Your Skill." },
      {
        name: "description",
        content:
          "Practice trading with virtual money. Simulated trades, XP, challenges and a Trading Skill Score. Educational paper trading only — no real money.",
      },
      { property: "og:title", content: "TradeVirt — Practice Trading. Build Your Skill." },
      {
        property: "og:description",
        content: "Trade with virtual money. Track your performance. Improve your trading discipline.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: CandlestickChart, title: "Real candlestick charts", body: "Professional charts with multiple timeframes." },
  { icon: ShieldCheck, title: "Risk-first scoring", body: "A Trading Skill Score built on discipline, not luck." },
  { icon: Target, title: "Daily challenges", body: "Practice goals that reward good habits." },
  { icon: Trophy, title: "Leaderboards", body: "Compete on skill, not on raw profit." },
];

/**
 * Supabase persists its session in localStorage under an "sb-<ref>-auth-token"
 * key. Reading it lets a returning signed-in user skip the marketing screen
 * entirely instead of seeing it flash while getSession() resolves.
 */
function hasStoredSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token") && window.localStorage.getItem(key)) {
        return true;
      }
    }
  } catch {
    // Storage blocked → fall back to the async session check below.
  }
  return false;
}

function Landing() {
  const navigate = useNavigate();
  // "checking" while the stored session is verified; a returning user therefore
  // sees the splash, never the sign-in call-to-action.
  const [state, setState] = useState<"checking" | "redirecting" | "guest">("checking");

  useEffect(() => {
    let active = true;
    if (hasStoredSession()) setState("redirecting");
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        setState("redirecting");
        navigate({ to: "/home", replace: true });
      } else {
        setState("guest");
      }
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  if (state !== "guest") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 gradient-hero">
        <BrandMark size="lg" className="animate-pulse rounded-3xl p-4" />
        <p className="text-xl font-semibold tracking-tight">
          Trade<span className="text-primary">Virt</span>
        </p>
        <Loader2 className="size-5 animate-spin text-primary" />
      </main>
    );
  }


  return (
    <main className="mesh-bg min-h-screen bg-background">

      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6 pb-10 pt-16">
        <BrandLogo size="md" withTagline />
        <SimulationBadge className="mt-6 self-start" />
        <h1 className="mt-6 text-[2.6rem] font-bold leading-[1.05] tracking-tight">
          Practice Trading.
          <br />
          <span className="text-gradient">Build Your Skill.</span>
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Trade with virtual money. Track your performance. Improve your trading discipline — without
          risking a single real dollar.
        </p>

        <div className="mt-8 grid gap-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bento-tile bento-tile-interactive animate-rise flex items-start gap-3 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
                <f.icon className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Button asChild size="lg" className="h-13 rounded-2xl text-base font-semibold shadow-[0_18px_40px_-18px_oklch(0.78_0.17_158/80%)]">
            <Link to="/auth">Create free account</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-13 rounded-2xl border-border/70 bg-elevated/40">
            <Link to="/auth">I already have an account</Link>
          </Button>
        </div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
          This application provides simulated paper trading only. No real money trading is available.
          Virtual balance and credits have no monetary value and cannot be withdrawn, transferred or
          redeemed.
        </p>
        <div className="mt-4 flex justify-center gap-4 text-[11px] text-muted-foreground underline">
          <Link to="/legal/terms">Terms</Link>
          <Link to="/legal/privacy">Privacy</Link>
          <Link to="/legal/disclaimer">Disclaimer</Link>
          <Link to="/legal/support">Support</Link>
        </div>
      </div>
    </main>
  );
}
