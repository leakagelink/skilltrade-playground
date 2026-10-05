import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdvancedAnalytics } from "@/lib/advanced-analytics.functions";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerNote } from "@/components/Disclaimer";
import { Skeleton } from "@/components/ui/skeleton";
import { signedMoney, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Advanced Analytics — TradeVirt" },
      { name: "description", content: "Detailed analysis of your simulated trading habits: win rate, drawdown, risk use and best assets." },
      { property: "og:title", content: "Advanced Analytics — TradeVirt" },
      { property: "og:description", content: "Understand your simulated trading habits in depth." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

const TYPE_LABEL: Record<string, string> = { STOCK: "US stocks", IN_STOCK: "Indian stocks", COMMODITY: "Commodities", CRYPTO: "Crypto" };
const tone = (v: number) => (v > 0 ? "text-success" : v < 0 ? "text-destructive" : "");

function Stat({ label, value, cls = "" }: { label: string; value: string; cls?: string }) {
  return (
    <div className="bento-tile p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-base font-bold ${cls}`}>{value}</p>
    </div>
  );
}

function Bars({ rows }: { rows: { key: string; pnl: number; trades: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center gap-2 text-xs">
          <span className="w-20 shrink-0 truncate">{TYPE_LABEL[r.key] ?? r.key}</span>
          <div className="h-2 flex-1 rounded bg-secondary">
            <div className={`h-2 rounded ${r.pnl >= 0 ? "bg-success" : "bg-destructive"}`} style={{ width: `${(Math.abs(r.pnl) / max) * 100}%` }} />
          </div>
          <span className={`w-20 text-right ${tone(r.pnl)}`}>{signedMoney(r.pnl)}</span>
        </div>
      ))}
    </div>
  );
}

function Curve({ pts }: { pts: { v: number }[] }) {
  if (pts.length < 2) return <p className="text-xs text-muted-foreground">Close at least 2 trades to see your curve.</p>;
  const vals = [0, ...pts.map((p) => p.v)];
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const d = vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${40 - ((v - min) / span) * 40}`).join(" ");
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-28 w-full">
      <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" className="text-primary" />
    </svg>
  );
}

function AnalyticsPage() {
  const fn = useServerFn(getAdvancedAnalytics);
  const { data, isLoading } = useQuery({ queryKey: ["advanced-analytics"], queryFn: () => fn() });

  const insights: string[] = [];
  if (data && data.total >= 3) {
    if (data.stopLossPct < 50) insights.push(`Only ${data.stopLossPct.toFixed(0)}% of your trades used a stop loss. Practising with one helps limit losses.`);
    if (data.avgLoss > data.avgWin && data.avgWin > 0) insights.push("Your average loss is bigger than your average win. Consider closing losing trades earlier.");
    if (data.longestLossStreak >= 4) insights.push(`You had ${data.longestLossStreak} losses in a row. A short break after 2–3 losses can help.`);
    if (data.best[0]) insights.push(`${data.best[0].key} is your best-performing symbol so far.`);
  }

  return (
    <div className="pb-24">
      <AppHeader title="Advanced Analytics" />
      <div className="space-y-4 px-4 pt-3">
        {isLoading || !data ? <Skeleton className="h-64 w-full" /> : data.total === 0 ? (
          <div className="bento-tile p-6 text-center text-sm text-muted-foreground">Close a few simulated trades to unlock your analytics.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Closed trades" value={String(data.total)} />
              <Stat label="Win rate" value={`${data.winRate.toFixed(1)}%`} />
              <Stat label="Net result" value={signedMoney(data.netPnl)} cls={tone(data.netPnl)} />
              <Stat label="Profit factor" value={data.profitFactor == null ? "∞" : data.profitFactor.toFixed(2)} />
              <Stat label="Average win" value={money(data.avgWin)} cls="text-success" />
              <Stat label="Average loss" value={money(data.avgLoss)} cls="text-destructive" />
              <Stat label="Max drawdown" value={money(data.maxDrawdown)} />
              <Stat label="Avg hold time" value={data.avgHoldHours < 24 ? `${data.avgHoldHours.toFixed(1)}h` : `${(data.avgHoldHours / 24).toFixed(1)}d`} />
            </div>

            <section className="bento-tile p-4">
              <h2 className="mb-2 text-sm font-bold">Result over time</h2>
              <Curve pts={data.curve} />
            </section>

            <section className="bento-tile space-y-2 p-4">
              <h2 className="text-sm font-bold">Risk habits</h2>
              <p className="text-xs">Stop loss used: <b>{data.stopLossPct.toFixed(0)}%</b> · Take profit used: <b>{data.takeProfitPct.toFixed(0)}%</b></p>
              <p className="text-xs">Average trade size: <b>{money(data.avgSize)}</b></p>
              <p className="text-xs">Longest win streak: <b>{data.longestWinStreak}</b> · Longest loss streak: <b>{data.longestLossStreak}</b></p>
            </section>

            <section className="bento-tile p-4"><h2 className="mb-3 text-sm font-bold">By market</h2><Bars rows={data.byType} /></section>
            <section className="bento-tile p-4"><h2 className="mb-3 text-sm font-bold">Buy vs Sell</h2><Bars rows={data.byDirection} /></section>
            <section className="bento-tile p-4"><h2 className="mb-3 text-sm font-bold">By day of week</h2><Bars rows={data.byDay.filter((d) => d.trades)} /></section>
            <section className="bento-tile p-4"><h2 className="mb-3 text-sm font-bold">Last 8 weeks</h2><Bars rows={data.weekly} /></section>

            <section className="bento-tile p-4">
              <h2 className="mb-2 text-sm font-bold">Best & worst symbols</h2>
              {[...data.best, ...data.worst].map((s, i) => (
                <div key={s.key + i} className="flex justify-between py-1 text-xs">
                  <span>{s.key} <span className="text-muted-foreground">({s.trades} trades, {Math.round((s.wins / s.trades) * 100)}% wins)</span></span>
                  <span className={tone(s.pnl)}>{signedMoney(s.pnl)}</span>
                </div>
              ))}
            </section>

            {insights.length > 0 && (
              <section className="bento-tile space-y-2 p-4">
                <h2 className="text-sm font-bold">Observations</h2>
                {insights.map((t) => <p key={t} className="text-xs text-muted-foreground">• {t}</p>)}
              </section>
            )}
          </>
        )}
        <DisclaimerNote />
      </div>
    </div>
  );
}
