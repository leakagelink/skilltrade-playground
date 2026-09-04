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
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
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
    <main className="pb-8">
      <section className="mesh-bg relative overflow-hidden px-5 pb-6 pt-7">
        <div className="animate-rise flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Welcome back
            </p>
            <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight">{p.username}</h1>
          </div>
          <SimulationBadge />
        </div>

        {/* Hero equity card */}
        <div className="brand-gradient brand-shadow animate-rise relative mt-5 overflow-hidden rounded-[28px] p-5">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary-foreground/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 size-48 rounded-full bg-primary-foreground/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">
                <Wallet className="size-3.5" /> Live equity
              </div>
              {s.openTrades > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[11px] font-semibold">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-70" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-current" />
                  </span>
                  {signedMoney(openPnl)}
                </span>
              ) : null}
            </div>

            <p className="num mt-2 text-[40px] font-bold leading-none tracking-tight">{money(equity)}</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-primary-foreground/12 px-3 py-2 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wider opacity-75">Cash</p>
                <p className="num text-sm font-semibold">{money(p.virtualBalance)}</p>
              </div>
              <div className="rounded-2xl bg-primary-foreground/12 px-3 py-2 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wider opacity-75">Credits</p>
                <p className="num flex items-center gap-1 text-sm font-semibold">
                  <Coins className="size-3.5" /> {p.virtualCredits}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span>
                  Level {p.level} · {p.levelTitle}
                </span>
                <span className="num opacity-80">
                  {p.xp} / {p.xpCeiling} XP
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary-foreground/25">
                <div
                  className="h-full rounded-full bg-primary-foreground transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bento grid */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link to="/profile" className="bento-tile bento-tile-interactive animate-rise col-span-1 p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Trophy className="size-3.5" /> Skill score
            </div>
            <p className="num mt-2 text-3xl font-bold text-primary">{p.skillScore}</p>
            <p className="text-[11px] text-muted-foreground">out of 1000</p>
          </Link>

          <div className="bento-tile animate-rise col-span-1 p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Gift className="size-3.5" /> Daily reward
            </div>
            {canClaim ? (
              <p className="num mt-2 text-2xl font-bold text-bull">+{data.dailyReward.amount}</p>
            ) : (
              <p className="num mt-2 text-2xl font-bold tabular-nums">{countdown}</p>
            )}
            <Button
              size="sm"
              className="mt-3 h-9 w-full rounded-xl text-xs font-semibold"
              disabled={!canClaim || claimMutation.isPending}
              onClick={() => claimMutation.mutate()}
            >
              {canClaim ? "Claim credits" : "Claimed"}
            </Button>
          </div>
        </div>

        <p className="section-title mt-6">Performance</p>
        <div className="bento-tile animate-rise mt-2 grid grid-cols-3 gap-y-4 p-4">
          <Stat label="Total P&L" value={signedMoney(s.totalPnl)} tone={s.totalPnl >= 0 ? "bull" : "bear"} />
          <Stat label="Win rate" value={`${s.winRate}%`} />
          <Stat label="Trades" value={String(s.totalTrades)} />
          <Stat label="Open" value={String(s.openTrades)} />
          <Stat label="Closed" value={String(s.closedTrades)} />
          <Stat label="Drawdown" value={pct(-s.maxDrawdown)} tone="bear" />
        </div>
      </section>


      <section className="space-y-3 px-5">
        {p.virtualCredits === 0 ? (
          <div className="bento-tile p-4">
            <p className="text-sm font-semibold">You need Trading Credits to open a new trade.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Watching an ad is completely optional — you can simply wait for your daily reward.
            </p>
            <div className="mt-3 grid gap-2">
              <RewardedAdButton />
            </div>
          </div>
        ) : null}

        <Button asChild size="lg" className="h-13 w-full rounded-2xl text-base font-semibold shadow-[0_16px_36px_-18px_oklch(0.78_0.17_158/80%)]">
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
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`num mt-0.5 text-base font-semibold ${
          tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
