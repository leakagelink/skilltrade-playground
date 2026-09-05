import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bot, History, Loader2, Swords } from "lucide-react";
import {
  closeArenaTrade,
  endArenaNow,
  getArenaState,
  openArenaTrade,
  startArena,
} from "@/lib/arena.functions";
import { ARENA_BOTS, ARENA_DURATION_DAYS, ARENA_STARTING_CAPITAL, ARENA_UNIVERSE, arenaBot } from "@/lib/arena/bots";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DisclaimerNote, MarketDataNote, SimulationBadge } from "@/components/Disclaimer";
import { AiOpponentCard, ArenaResultCard, ArenaScoreCard, VersusPanel } from "@/components/arena/ArenaParts";
import { AssetLogo } from "@/components/AssetLogo";
import { money, pct, signedMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/ai-arena/")({
  head: () => ({
    meta: [
      { title: "Beat the AI Arena — TradeVirt" },
      {
        name: "description",
        content:
          "Challenge a simulated AI trading opponent in a 7-day virtual money competition scored on return, risk and consistency.",
      },
      { property: "og:title", content: "Beat the AI Arena — TradeVirt" },
      {
        property: "og:description",
        content: "A simulated trading competition against rule-based AI opponents. Virtual funds only.",
      },
    ],
  }),
  component: ArenaPage,
});

function countdownOf(ms: number): string {
  const clamped = Math.max(0, ms);
  const d = Math.floor(clamped / 86_400_000);
  const h = Math.floor((clamped % 86_400_000) / 3_600_000);
  const m = Math.floor((clamped % 3_600_000) / 60_000);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
}

function ArenaPage() {
  const qc = useQueryClient();
  const load = useServerFn(getArenaState);
  const start = useServerFn(startArena);
  const open = useServerFn(openArenaTrade);
  const close = useServerFn(closeArenaTrade);
  const end = useServerFn(endArenaNow);
  const [now, setNow] = useState(() => Date.now());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["arena"],
    queryFn: () => load(),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["arena"] });

  const startMutation = useMutation({
    mutationFn: (botId: string) => start({ data: { botId } }),
    onSuccess: () => {
      toast.success("Arena challenge started. Good luck!");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not create the Arena challenge."),
  });

  const closeMutation = useMutation({
    mutationFn: (tradeId: string) => close({ data: { tradeId } }),
    onSuccess: (r) => {
      toast.success(`Arena trade closed — simulated P&L ${signedMoney(r.pnl)}.`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not close this Arena trade."),
  });

  const endMutation = useMutation({
    mutationFn: () => end({}),
    onSuccess: (r) => {
      toast.success(r.summary || "Arena challenge finished.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not finish this Arena challenge."),
  });

  if (isLoading) {
    return (
      <main className="pb-28">
        <AppHeader title="Beat the AI" />
        <div className="space-y-3 p-5">
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="pb-28">
        <AppHeader title="Beat the AI" />
        <div className="p-5">
          <p className="bento-tile p-4 text-sm">
            The AI Arena could not be loaded right now. Please check your connection and try again.
          </p>
        </div>
      </main>
    );
  }

  const active = data.active;
  const bot = active ? arenaBot(active.botId) : undefined;
  const lastResult = data.history[0];

  return (
    <main className="pb-28">
      <AppHeader title="Beat the AI" />

      <section className="space-y-4 px-5 pt-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight">
              <Bot className="size-5 text-primary" aria-hidden="true" /> Beat the AI
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose an AI trading opponent and test your trading skills with virtual funds.
            </p>
          </div>
          <SimulationBadge />
        </div>

        {active && bot ? (
          <>
            <VersusPanel
              botName={bot.name}
              botStyle={bot.style}
              userEquity={active.user.equity}
              userReturn={active.user.returnPct}
              aiEquity={active.ai.equity}
              aiReturn={active.ai.returnPct}
              countdown={countdownOf(new Date(active.endTime).getTime() - now)}
            />

            {!active.marketDataOk ? (
              <p className="rounded-2xl border border-bear/40 bg-bear/10 p-3 text-xs text-bear">
                Market data is temporarily unavailable for some assets. Values shown use the latest
                available prices only.
              </p>
            ) : null}

            <div className="bento-tile grid grid-cols-3 gap-y-3 p-4">
              <Stat label="Arena cash" value={money(active.user.cash)} />
              <Stat label="Open P&L" value={signedMoney(active.user.openPnl)} />
              <Stat label="Closed P&L" value={signedMoney(active.user.realizedPnl)} />
              <Stat label="Open trades" value={String(active.user.openTrades.length)} />
              <Stat label="Completed" value={String(active.user.closedTrades.length)} />
              <Stat label={`${bot.name} trades`} value={String(active.ai.openCount + active.ai.closedCount)} />
            </div>

            <ArenaScoreCard score={active.user.score} />

            <ArenaTicket
              onSubmit={(payload) => open({ data: payload })}
              onDone={invalidate}
              maxSize={active.user.cash}
            />

            <div>
              <p className="section-title">Your Arena positions</p>
              {active.user.openTrades.length === 0 ? (
                <p className="mt-2 rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No open Arena positions yet.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {active.user.openTrades.map((t) => (
                    <li key={t.id} className="bento-tile flex items-center gap-3 p-3">
                      <AssetLogo symbol={t.symbol} assetType={t.asset_type === "CRYPTO" ? "CRYPTO" : "STOCK"} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {t.symbol} · {t.direction}
                        </p>
                        <p className="num text-[11px] text-muted-foreground">
                          {money(t.position_size)} @ {money(t.entry_price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`num text-sm font-semibold ${
                            (t.unrealized_pnl ?? 0) >= 0 ? "text-bull" : "text-bear"
                          }`}
                        >
                          {signedMoney(t.unrealized_pnl ?? 0)}
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-1 h-8 rounded-xl text-[11px]"
                          disabled={closeMutation.isPending}
                          onClick={() => closeMutation.mutate(t.id)}
                          aria-label={`Close ${t.symbol} Arena position`}
                        >
                          Close
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="section-title">{bot.name} activity</p>
              {active.ai.recentTrades.length === 0 ? (
                <p className="mt-2 rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  {bot.name} has not opened a simulated position yet.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {active.ai.recentTrades.map((t) => (
                    <li key={t.id} className="bento-tile flex items-center justify-between gap-3 p-3 text-xs">
                      <span className="font-semibold">
                        {t.symbol} · {t.direction}
                      </span>
                      <span className="text-muted-foreground">{t.status.replace(/_/g, " ")}</span>
                      <span
                        className={`num font-semibold ${
                          (t.pnl ?? t.unrealized_pnl ?? 0) >= 0 ? "text-bull" : "text-bear"
                        }`}
                      >
                        {signedMoney(t.pnl ?? t.unrealized_pnl ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                {bot.name} follows a fixed, rule-based simulation strategy on the same market data you see.
                It does not predict markets and its results are not a forecast.
              </p>
            </div>

            <Button
              variant="outline"
              className="h-11 w-full rounded-2xl text-sm"
              disabled={endMutation.isPending}
              onClick={() => endMutation.mutate()}
            >
              {endMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Finish challenge now
            </Button>
          </>
        ) : (
          <>
            {lastResult ? (
              <ArenaResultCard
                botName={arenaBot(lastResult.botId)?.name ?? "AI"}
                winner={lastResult.winner}
                summary={lastResult.summary}
                userReturn={lastResult.userReturn}
                aiReturn={lastResult.aiReturn}
              />
            ) : (
              <div className="bento-tile flex flex-col items-center gap-2 p-6 text-center">
                <Swords className="size-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold">No AI Arena challenges yet.</p>
                <p className="text-xs text-muted-foreground">
                  Pick an opponent below to start a {ARENA_DURATION_DAYS}-day simulated challenge with{" "}
                  {money(ARENA_STARTING_CAPITAL, 0)} in virtual funds each.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {ARENA_BOTS.map((b) => (
                <AiOpponentCard
                  key={b.id}
                  bot={b}
                  disabled={startMutation.isPending}
                  onChallenge={(id) => startMutation.mutate(id)}
                />
              ))}
            </div>
          </>
        )}

        <Button asChild variant="secondary" className="h-11 w-full rounded-2xl text-sm font-semibold">
          <Link to="/ai-arena/history">
            <History className="size-4" /> Arena history
          </Link>
        </Button>

        <DisclaimerNote text="The AI Arena is a simulated trading competition using virtual funds. No real-money trading is available, and virtual balances, scores and rewards have no monetary value. AI Arena opponents use predefined simulation strategies." />
        <MarketDataNote />
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="num mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function ArenaTicket({
  onSubmit,
  onDone,
  maxSize,
}: {
  onSubmit: (p: {
    symbol: string;
    direction: "BUY" | "SELL";
    positionSize: number;
    stopLoss: number | null;
    takeProfit: number | null;
  }) => Promise<unknown>;
  onDone: () => void;
  maxSize: number;
}) {
  const [symbol, setSymbol] = useState(ARENA_UNIVERSE[0]!);
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [size, setSize] = useState("5000");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      onSubmit({
        symbol,
        direction,
        positionSize: Number(size),
        stopLoss: sl ? Number(sl) : null,
        takeProfit: tp ? Number(tp) : null,
      }),
    onSuccess: () => {
      toast.success("Arena position opened at the latest available price.");
      setSl("");
      setTp("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message || "Could not open this Arena trade."),
  });

  return (
    <div className="bento-tile space-y-3 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        New Arena position
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {ARENA_UNIVERSE.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSymbol(s)}
            aria-pressed={symbol === s}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold ${
              symbol === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["BUY", "SELL"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            aria-pressed={direction === d}
            className={`h-11 rounded-2xl text-sm font-semibold ${
              direction === d
                ? d === "BUY"
                  ? "bg-bull text-background"
                  : "bg-bear text-background"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="text-[11px] text-muted-foreground">
          Size (USD)
          <Input value={size} inputMode="decimal" onChange={(e) => setSize(e.target.value)} className="mt-1 h-10" />
        </label>
        <label className="text-[11px] text-muted-foreground">
          Stop loss
          <Input value={sl} inputMode="decimal" onChange={(e) => setSl(e.target.value)} className="mt-1 h-10" />
        </label>
        <label className="text-[11px] text-muted-foreground">
          Take profit
          <Input value={tp} inputMode="decimal" onChange={(e) => setTp(e.target.value)} className="mt-1 h-10" />
        </label>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Available Arena capital: <span className="num font-semibold">{money(maxSize)}</span>. Arena trades use
        the latest available market price and do not affect your main paper trading portfolio or credits.
      </p>

      <Button
        className="h-11 w-full rounded-2xl text-sm font-semibold"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Open {direction} · {symbol}
      </Button>
    </div>
  );
}

export { pct };
