import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CandlestickChart, ShieldCheck, Target, Trophy } from "lucide-react";
import { SimulationBadge } from "@/components/Disclaimer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PaperEdge — Practice Trading. Build Your Skill." },
      {
        name: "description",
        content:
          "Practice trading with virtual money. Simulated trades, XP, challenges and a Trading Skill Score. Educational paper trading only — no real money.",
      },
      { property: "og:title", content: "PaperEdge — Practice Trading. Build Your Skill." },
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

function Landing() {
  return (
    <main className="min-h-screen gradient-hero">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6 pb-10 pt-16">
        <SimulationBadge className="self-start" />
        <h1 className="mt-6 text-4xl font-bold leading-tight">
          Practice Trading.
          <br />
          <span className="text-primary">Build Your Skill.</span>
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Trade with virtual money. Track your performance. Improve your trading discipline — without
          risking a single real dollar.
        </p>

        <div className="mt-8 grid gap-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="surface-card flex items-start gap-3 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
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
          <Button asChild size="lg" className="h-12 rounded-xl text-base font-semibold">
            <Link to="/auth">Create free account</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 rounded-xl">
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
        </div>
      </div>
    </main>
  );
}
