import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Share2 } from "lucide-react";
import { closeCompetitionTrade, getCompetition, openCompetitionTrade } from "@/lib/compete.functions";
import { COMPETITION_DISCLOSURES, statusLabel } from "@/lib/compete/config";
import { AppHeader } from "@/components/AppHeader";
import { AssetLogo } from "@/components/AssetLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { money, signedMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/compete/$id")({
  head: () => ({
    meta: [
      { title: "Competition — TradeVirt" },
      {
        name: "description",
        content: "Track your simulated competition standings, place virtual trades and see the live leaderboard.",
      },
      { property: "og:title", content: "Competition — TradeVirt" },
      { property: "og:description", content: "Simulated trading competition with virtual funds only." },
    ],
  }),
  component: CompetitionPage,
});

function CompetitionPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const load = useServerFn(getCompetition);
  const open = useServerFn(openCompetitionTrade);
  const close = useServerFn(closeCompetitionTrade);

  const [symbol, setSymbol] = useState("");
  const [size, setSize] = useState("1000");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["competition", id],
    queryFn: () => load({ data: { competitionId: id } }),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["competition", id] });

  const openMutation = useMutation({
    mutationFn: (direction: "BUY" | "SELL") =>
      open({
        data: {
          competitionId: id,
          symbol: symbol || (data?.symbols[0] ?? ""),
          direction,
          positionSize: Number(size),
          stopLoss: stopLoss ? Number(stopLoss) : null,
          takeProfit: takeProfit ? Number(takeProfit) : null,
        },
      }),
    onSuccess: () => {
      toast.success("Simulated trade placed.");
      setStopLoss("");
      setTakeProfit("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not place the trade."),
  });

  const closeMutation = useMutation({
    mutationFn: (tradeId: string) => close({ data: { tradeId } }),
    onSuccess: (res) => {
      toast.success(`Trade closed at ${money(res.exit)} (${signedMoney(res.pnl)}).`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not close the trade."),
  });

  async function shareResult() {
    if (!data?.me) return;
    const text = `My TradeVirt simulated competition result: rank #${
      data.standings.find((s) => s.username && s.rank)?.rank ?? "—"
    }, score ${data.me.score.total}, return ${data.me.returnPct}%. Virtual funds only — no real money.`;
    try {
      if (navigator.share) await navigator.share({ title: "TradeVirt competition", text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Result copied.");
      }
    } catch {
      /* dismissed */
    }
  }

  const selected = symbol || data?.symbols[0] || "";

  return (
    <main>
      <AppHeader title={data?.competition.title ?? "Competition"} subtitle="Simulated competition" />

      <div className="space-y-4 p-5">
        <Link to="/compete" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="size-3.5" /> Back to Compete
        </Link>

        {isLoading || !data ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <>
            <div className="surface-card space-y-1 p-4">
              <p className="text-sm font-semibold">
                {statusLabel(data.competition.status)} · {data.participantCount} participants
              </p>
              <p className="text-[11px] text-muted-foreground">
                Everyone starts with {money(data.competition.startingBalance)} virtual funds.
                {data.competition.endTime ? ` Ends ${new Date(data.competition.endTime).toLocaleString()}.` : ""}
              </p>
              {!data.marketDataOk ? (
                <p className="text-[11px] text-amber-500">
                  Some market data is delayed or unavailable, so values may not be current.
                </p>
              ) : null}
            </div>

            {data.me ? (
              <div className="surface-card space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Your simulated portfolio</p>
                  <Button size="sm" variant="ghost" onClick={() => void shareResult()}>
                    <Share2 className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <p>Equity: <span className="num text-foreground">{money(data.me.equity)}</span></p>
                  <p>Return: <span className="num text-foreground">{data.me.returnPct}%</span></p>
                  <p>Score: <span className="num text-foreground">{data.me.score.total}</span></p>
                  <p>Max drawdown: <span className="num text-foreground">{data.me.drawdown}%</span></p>
                </div>
              </div>
            ) : null}

            {data.competition.status === "ACTIVE" && data.me ? (
              <div className="surface-card space-y-3 p-4">
                <p className="text-sm font-semibold">Place a simulated trade</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.symbols.slice(0, 16).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSymbol(s)}
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                        selected === s ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      <AssetLogo symbol={s} className="size-4" />
                      {s}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="Size" className="num" />
                  <Input
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="Stop loss"
                    className="num"
                  />
                  <Input
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="Take profit"
                    className="num"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => openMutation.mutate("BUY")} disabled={openMutation.isPending}>
                    {openMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Buy
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => openMutation.mutate("SELL")}
                    disabled={openMutation.isPending}
                  >
                    Sell
                  </Button>
                </div>
              </div>
            ) : null}

            {data.me?.openTrades.length ? (
              <div className="surface-card space-y-2 p-4">
                <p className="text-sm font-semibold">Open positions</p>
                {data.me.openTrades.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">
                        {t.direction} {t.symbol}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {money(t.position_size)} @ {money(t.entry_price)} · {signedMoney(t.unrealized_pnl ?? 0)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => closeMutation.mutate(t.id)}>
                      Close
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="surface-card space-y-2 p-4">
              <p className="text-sm font-semibold">Standings</p>
              {!data.standings.length ? (
                <p className="text-xs text-muted-foreground">No participants yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.standings.map((s) => (
                    <li key={s.userId} className="flex items-center gap-3 border-t border-border/60 pt-1.5 text-xs">
                      <span className="num w-5 text-muted-foreground">{s.rank}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold">{s.username}</span>
                      <span className="num text-muted-foreground">{s.returnPct}%</span>
                      <span className="num font-semibold text-primary">{s.score}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-muted-foreground">
                Ranked by the Simulation Competition Score: return, risk management, drawdown control and consistency.
              </p>
            </div>

            {data.competition.resultSummary ? (
              <div className="surface-card p-4 text-xs text-muted-foreground">{data.competition.resultSummary}</div>
            ) : null}
          </>
        )}

        <div className="surface-card space-y-1 p-4">
          {COMPETITION_DISCLOSURES.map((d) => (
            <p key={d} className="text-[11px] text-muted-foreground">
              {d}
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}
