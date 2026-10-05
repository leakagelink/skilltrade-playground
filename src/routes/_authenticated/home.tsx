import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RewardedAdOffer } from "@/components/ads/RewardedAdOffer";
import { claimDailyReward, getDashboard, getTrades, syncOpenTrades } from "@/lib/trading.functions";
import { OpenPositions } from "@/components/OpenPositions";
import { PracticeJourneyCard } from "@/components/PracticeJourneyCard";
import { ModeTip } from "@/components/ModeTip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DisclaimerNote, SimulationBadge } from "@/components/Disclaimer";
import { money, pct, signedMoney } from "@/lib/format";
import { Coins, Gift, TrendingUp, Trophy, Wallet } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

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
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    refetchOnMount: true,
    staleTime: 15_000,
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
      void trackEvent("daily_reward_claimed");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["ad-status"] });
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
    <main className="pb-2">
      <section className="mesh-bg safe-top-section relative overflow-hidden px-4 pb-3 sm:px-5">
        <div className="animate-rise grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Welcome back
            </p>
            <h1 className="mt-0.5 truncate text-lg font-extrabold leading-tight tracking-tight sm:text-[26px]">
              {p.username}
            </h1>
          </div>
          <div className="shrink-0">
            <SimulationBadge />
          </div>
        </div>

        {/* Hero equity card */}
        <div className="brand-gradient brand-shadow animate-rise relative mt-2 overflow-hidden rounded-[20px] p-2.5 sm:p-4">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary-foreground/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 size-48 rounded-full bg-primary-foreground/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">
                <Wallet className="size-3.5" /> Portfolio equity
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

            <p className="num mt-1 text-[clamp(1.25rem,6.5vw,1.75rem)] font-bold leading-none tracking-tight">{money(equity)}</p>

            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <div className="rounded-xl bg-primary-foreground/12 px-2.5 py-1.5 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wider opacity-75">Cash</p>
                <p className="num text-[13px] font-semibold">{money(p.virtualBalance)}</p>
              </div>
              <div className="rounded-xl bg-primary-foreground/12 px-2.5 py-1.5 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wider opacity-75">Credits</p>
                <p className="num flex items-center gap-1 text-[13px] font-semibold">
                  <Coins className="size-3.5" /> {p.virtualCredits}
                </p>
              </div>
            </div>

            <div className="mt-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span>
                  Level {p.level} · {p.levelTitle}
                </span>
                <span className="num opacity-80">
                  {p.xp} / {p.xpCeiling} XP
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-primary-foreground/25">
                <div
                  className="h-full rounded-full bg-primary-foreground transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bento grid */}
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <Link to="/profile" className="bento-tile bento-tile-interactive animate-rise col-span-1 p-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Trophy className="size-3.5" /> Skill score
            </div>
            <p className="num mt-1 text-lg font-bold text-primary sm:text-2xl">{p.skillScore}</p>
            <p className="text-[10px] text-muted-foreground">out of 1000</p>
          </Link>

          <div className="bento-tile animate-rise col-span-1 p-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Gift className="size-3.5" /> Daily reward
            </div>
            {canClaim ? (
              <p className="num mt-1 text-lg font-bold text-bull">+{data.dailyReward.amount}</p>
            ) : (
              <p className="num mt-1 text-lg font-bold tabular-nums">{countdown}</p>
            )}
            <Button
              size="sm"
              className="mt-1.5 h-7 w-full rounded-lg text-[11px] font-semibold"
              disabled={!canClaim || claimMutation.isPending}
              onClick={() => claimMutation.mutate()}
            >
              {canClaim ? "Claim credits" : "Claimed"}
            </Button>
          </div>
        </div>

        <div className="mt-2">
          <RewardedAdOffer
            placement="DAILY_DOUBLE"
            title="Double today's daily reward"
            onGranted={() => void qc.invalidateQueries({ queryKey: ["dashboard"] })}
          />
        </div>

        <p className="section-title mt-2">Performance</p>
        <div className="bento-tile animate-rise mt-1 grid grid-cols-3 gap-x-2 gap-y-1 p-2">
          <Stat label="Total P&L" value={signedMoney(s.totalPnl)} tone={s.totalPnl >= 0 ? "bull" : "bear"} />
          <Stat label="Win rate" value={`${s.winRate}%`} />
          <Stat label="Trades" value={String(s.totalTrades)} />
          <Stat label="Open" value={String(s.openTrades)} />
          <Stat label="Closed" value={String(s.closedTrades)} />
          <Stat label="Drawdown" value={pct(-s.maxDrawdown)} tone="bear" />
        </div>
      </section>


      <section className="mt-1.5 space-y-1.5 px-4 sm:px-5">
        <ModeTip screen="home" />
        <PracticeJourneyCard />
        <p className="section-title">Open positions</p>
        <OpenPositionsSection />

        {p.virtualCredits === 0 ? (
          <div className="bento-tile p-4">
            <p className="text-sm font-semibold">You need Trading Credits to open a new trade.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You receive 3 Trading Credits every 24 hours, plus credits from completed challenges. Come
              back when your daily reward unlocks.
            </p>
          </div>
        ) : null}

        <Button asChild size="lg" className="h-10 w-full rounded-xl text-sm font-semibold shadow-[0_16px_36px_-18px_oklch(0.78_0.17_158/80%)]">
          <Link to="/trade">
            <TrendingUp className="size-4" /> Continue Trading
          </Link>
        </Button>

        <DisclaimerNote />
      </section>
    </main>
  );
}

function OpenPositionsSection() {
  const loadTrades = useServerFn(getTrades);
  const trades = useQuery({
    queryKey: ["trades"],
    queryFn: () => loadTrades(),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
  const open = (trades.data?.trades ?? []).filter((t) => t.status === "OPEN");
  if (trades.isLoading) return <Skeleton className="h-24 w-full rounded-2xl" />;
  return (
    <div className="max-h-28 space-y-2 overflow-y-auto pr-0.5">
      <OpenPositions trades={open} emptyText="Open a simulated trade to see it here with live P&L." />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`num mt-0.5 break-words text-sm font-semibold sm:text-base ${
          tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
