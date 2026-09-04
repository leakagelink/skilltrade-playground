import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { claimDailyReward, getDashboard, syncOpenTrades } from "@/lib/trading.functions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DisclaimerNote, SimulationBadge } from "@/components/Disclaimer";
import { money, pct, signedMoney } from "@/lib/format";
import { Coins, Gift, TrendingUp, Trophy, Wallet } from "lucide-react";
import { toast } from "sonner";
import { RewardedAdButton } from "@/components/RewardedAdButton";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Dashboard — TradeVirt" },
      { name: "description", content: "Your virtual balance, trading credits, XP progress and simulated performance at a glance." },
      { property: "og:title", content: "Dashboard — TradeVirt" },
      { property: "og:description", content: "Track your simulated trading performance and daily rewards." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const load = useServerFn(getDashboard);
  const sync = useServerFn(syncOpenTrades);
  const claim = useServerFn(claimDailyReward);
  const [live, setLive] = useState<{ openPnl: number; equity: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => load(),
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    staleTime: 0,
  });

  // Mark open positions to real market prices every 5s.
  useEffect(() => {
    let active = true;
    const updateOpenTrades = () => {
      sync()
        .then((result) => {
          if (!active) return;
          setLive({ openPnl: result.openPnl, equity: result.equity });
          if (result.closed > 0) qc.invalidateQueries({ queryKey: ["dashboard"] });
        })
        .catch(() => {});
    };
    updateOpenTrades();
    const interval = window.setInterval(updateOpenTrades, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ticking clock so the daily-reward countdown unlocks in real time.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (data?.profile && !data.profile.onboardingCompleted) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [data, navigate]);

  const claimMutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: (r) => {
      toast.success(`+${r.granted} Trading Credits claimed.`);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not claim your reward right now."),
  });

  if (isLoading || !data?.profile) {
    return (
      <div className="space-y-4 p-5">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const p = data.profile;
  const s = data.stats;
  const span = Math.max(p.xpCeiling - p.xpFloor, 1);
  const xpProgress = Math.min(100, Math.max(0, ((p.xp - p.xpFloor) / span) * 100));
  const openPnl = live?.openPnl ?? s.openPnl;
  const equity = live?.equity ?? s.equity;
  const nextClaimMs = data.dailyReward.nextClaimAt ? new Date(data.dailyReward.nextClaimAt).getTime() : 0;
  const msLeft = Math.max(0, nextClaimMs - now);
  const canClaim = data.dailyReward.canClaim || msLeft === 0;
  const countdown = [
    Math.floor(msLeft / 3600000),
    Math.floor((msLeft % 3600000) / 60000),
    Math.floor((msLeft % 60000) / 1000),
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");


  return (
    <main className="pb-6">
      <section className="gradient-hero px-5 pb-6 pt-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Welcome back</p>
            <h1 className="text-2xl font-bold">{p.username}</h1>
          </div>
          <SimulationBadge />
        </div>

        <div className="mt-5 flex items-center justify-between text-xs">
          <span className="font-semibold text-primary">
            Level {p.level} · {p.levelTitle}
          </span>
          <span className="num text-muted-foreground">
            {p.xp} / {p.xpCeiling} XP
          </span>
        </div>
        <Progress value={xpProgress} className="mt-2 h-2" />

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="surface-card p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="size-3.5" /> Live Equity
            </div>
            <p className="num mt-1.5 text-lg font-semibold">{money(equity)}</p>
            <p className="text-[11px] text-muted-foreground">Cash {money(p.virtualBalance)}</p>
          </div>
          <div className="surface-card p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coins className="size-3.5" /> Trading Credits
            </div>
            <p className="num mt-1.5 text-lg font-semibold">{p.virtualCredits}</p>
          </div>
        </div>

        {s.openTrades > 0 ? (
          <div className="surface-card mt-3 flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                Open P&L · live market prices
              </div>
              <p className={`num mt-1 text-xl font-bold ${openPnl >= 0 ? "text-bull" : "text-bear"}`}>
                {signedMoney(openPnl)}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">{s.openTrades} open</p>
          </div>
        ) : null}

      </section>

      <section className="space-y-4 px-5">
        <div className="surface-card flex items-center justify-between p-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Trophy className="size-3.5" /> Trading Skill Score
            </div>
            <p className="num mt-1 text-2xl font-bold text-primary">{p.skillScore}</p>
            <p className="text-[11px] text-muted-foreground">out of 1000</p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-lg">
            <Link to="/profile">Details</Link>
          </Button>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-2">
            <Gift className="size-4 text-primary" />
            <p className="text-sm font-semibold uppercase tracking-wide">Daily Reward</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {canClaim
              ? `Claim your free ${data.dailyReward.amount} trading credits.`
              : "Next reward unlocks in"}
          </p>
          {!canClaim ? <p className="num mt-1 text-2xl font-bold tabular-nums">{countdown}</p> : null}
          <Button
            className="mt-3 h-11 w-full rounded-xl font-semibold"
            disabled={!canClaim || claimMutation.isPending}
            onClick={() => claimMutation.mutate()}
          >
            {canClaim ? "CLAIM DAILY CREDITS" : "ALREADY CLAIMED"}
          </Button>

        </div>

        {p.virtualCredits === 0 ? (
          <div className="surface-card p-4">
            <p className="text-sm font-semibold">You need Trading Credits to open a new trade.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Watching an ad is completely optional — you can simply wait for your daily reward.
            </p>
            <div className="mt-3 grid gap-2">
              <RewardedAdButton />
            </div>
          </div>
        ) : null}

        <div className="surface-card grid grid-cols-2 gap-y-4 p-4">
          <Stat label="Total simulated P&L" value={signedMoney(s.totalPnl)} tone={s.totalPnl >= 0 ? "bull" : "bear"} />
          <Stat label="Win rate" value={`${s.winRate}%`} />
          <Stat label="Total trades" value={String(s.totalTrades)} />
          <Stat label="Open trades" value={String(s.openTrades)} />
          <Stat label="Max drawdown" value={pct(-s.maxDrawdown)} tone="bear" />
          <Stat label="Closed trades" value={String(s.closedTrades)} />
        </div>

        <Button asChild size="lg" className="h-12 w-full rounded-xl text-base font-semibold">
          <Link to="/trade">
            <TrendingUp className="size-4" /> Continue Trading
          </Link>
        </Button>

        <DisclaimerNote />
      </section>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={`num text-base font-semibold ${
          tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
