import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard, getTrades } from "@/lib/trading.functions";
import { AppHeader } from "@/components/AppHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { EmptyState } from "@/components/EmptyState";
import { DisclaimerNote } from "@/components/Disclaimer";
import { dateTime, money, price, signedMoney } from "@/lib/format";
import { History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Trade History — TradeVirt" },
      { name: "description", content: "Review your simulated trade history, educational trade reviews and performance statistics." },
      { property: "og:title", content: "Profile — TradeVirt" },
      { property: "og:description", content: "Your simulated trading history and skill breakdown." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const loadDash = useServerFn(getDashboard);
  const loadTrades = useServerFn(getTrades);
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => loadDash() });
  const trades = useQuery({ queryKey: ["trades"], queryFn: () => loadTrades() });

  const all = trades.data?.trades ?? [];
  const open = all.filter((t) => t.status === "OPEN");
  const closed = all.filter((t) => t.status !== "OPEN");
  const p = dash.data?.profile;
  const s = dash.data?.stats;

  return (
    <main>
      <AppHeader title="Profile" subtitle={p ? `Level ${p.level} · ${p.levelTitle}` : "Your simulated performance"} showSettings />

      <div className="space-y-5 p-5">
        {dash.isLoading || !p || !s ? (
          <Skeleton className="h-32 w-full rounded-2xl" />
        ) : (
          <div className="surface-card grid grid-cols-3 gap-y-4 p-4 text-center">
            <Metric label="Skill score" value={String(p.skillScore)} />
            <Metric label="Win rate" value={`${s.winRate}%`} />
            <Metric label="Trades" value={String(s.totalTrades)} />
            <Metric label="Balance" value={money(p.virtualBalance, 0)} />
            <Metric label="Credits" value={String(p.virtualCredits)} />
            <Metric label="Net P&L" value={signedMoney(s.totalPnl)} tone={s.totalPnl >= 0 ? "bull" : "bear"} />
          </div>
        )}

        <Tabs defaultValue="closed">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
            <TabsTrigger value="closed">History ({closed.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-4 space-y-2">
            {open.length === 0 ? (
              <EmptyState icon={History} title="No open trades" description="Your active simulated positions appear here." />
            ) : (
              open.map((t) => <TradeRow key={t.id} trade={t} />)
            )}
          </TabsContent>

          <TabsContent value="closed" className="mt-4">
            {closed.length === 0 ? (
              <EmptyState icon={History} title="No trade history yet" description="Close a simulated trade to get your first educational review." />
            ) : (
              <Accordion type="single" collapsible className="space-y-2">
                {closed.map((t) => {
                  const pnl = Number(t.realized_pnl ?? 0);
                  return (
                    <AccordionItem key={t.id} value={t.id} className="surface-card border-none px-4">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex flex-1 items-center gap-3 pr-2 text-left">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">
                              {t.symbol} · {t.direction}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{dateTime(t.opened_at)}</p>
                          </div>
                          <span className={`num text-sm font-semibold ${pnl >= 0 ? "text-bull" : "text-bear"}`}>
                            {signedMoney(pnl)}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pb-4">
                        <div className="grid grid-cols-2 gap-y-2 text-xs">
                          <Detail label="Entry" value={price(Number(t.entry_price))} />
                          <Detail label="Exit" value={t.exit_price == null ? "—" : price(Number(t.exit_price))} />
                          <Detail label="Size" value={money(Number(t.position_size))} />
                          <Detail label="Status" value={String(t.status)} />
                          <Detail label="Stop loss" value={t.stop_loss == null ? "—" : price(Number(t.stop_loss))} />
                          <Detail label="Take profit" value={t.take_profit == null ? "—" : price(Number(t.take_profit))} />
                        </div>
                        {t.notes ? (
                          <div>
                            <p className="text-[11px] font-semibold uppercase text-muted-foreground">Your notes</p>
                            <p className="mt-1 text-xs">{t.notes}</p>
                          </div>
                        ) : null}
                        {t.review ? (
                          <div className="rounded-xl bg-secondary/60 p-3">
                            <p className="text-[11px] font-semibold uppercase text-primary">Trade review</p>
                            <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                              {t.review}
                            </p>
                            <p className="mt-2 text-[10px] text-muted-foreground">
                              Educational feedback only — not financial advice.
                            </p>
                          </div>
                        ) : null}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </TabsContent>
        </Tabs>

        <DisclaimerNote />
      </div>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" }) {
  return (
    <div>
      <p className={`num text-base font-semibold ${tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : ""}`}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="num font-medium">{value}</p>
    </div>
  );
}

function TradeRow({ trade }: { trade: { id: string; symbol: string; direction: string; entry_price: number; position_size: number; unrealized_pnl: number | null } }) {
  const pnl = Number(trade.unrealized_pnl ?? 0);
  return (
    <div className="surface-card flex items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {trade.symbol} · {trade.direction}
        </p>
        <p className="num text-xs text-muted-foreground">
          Entry {price(Number(trade.entry_price))} · {money(Number(trade.position_size))}
        </p>
      </div>
      <span className={`num text-sm font-semibold ${pnl >= 0 ? "text-bull" : "text-bear"}`}>{signedMoney(pnl)}</span>
    </div>
  );
}
