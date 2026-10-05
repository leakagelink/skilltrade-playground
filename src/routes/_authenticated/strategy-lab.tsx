import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getStrategyLab, saveStrategy, deleteStrategy, STRATEGY_MARKETS, STRATEGY_TIMEFRAMES,
} from "@/lib/strategy.functions";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerNote } from "@/components/Disclaimer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { signedMoney } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { FlaskConical, Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/strategy-lab")({
  head: () => ({
    meta: [
      { title: "Strategy Lab — TradeVirt" },
      { name: "description", content: "Define, save and review your own simulated trading strategies with objective practice results." },
      { property: "og:title", content: "Strategy Lab — TradeVirt" },
      { property: "og:description", content: "Build trading strategies and review their simulated results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StrategyLabPage,
});

const MARKET_LABEL: Record<string, string> = { any: "Any market", us: "US stocks", india: "Indian stocks", commodities: "Commodities", crypto: "Crypto" };

const TEXT_FIELDS = [
  ["entryConditions", "Entry conditions", "e.g. Price closes above 20-day average"],
  ["exitConditions", "Exit conditions", "e.g. Price closes below 20-day average"],
  ["stopLossRule", "Stop loss rule", "e.g. 2% below entry"],
  ["takeProfitRule", "Take profit rule", "e.g. 2x the stop-loss distance"],
  ["riskRule", "Risk rule", "e.g. Max 3 open trades at once"],
  ["positionSizingRule", "Position sizing rule", "e.g. 5% of virtual balance per trade"],
  ["notes", "Notes", ""],
] as const;

type Form = {
  id?: string; name: string; market: string; timeframe: string;
  requiresStopLoss: boolean; requiresTakeProfit: boolean; maxPositionPct: string;
} & Record<(typeof TEXT_FIELDS)[number][0], string>;

const empty = (): Form => ({
  name: "", market: "any", timeframe: "1D", requiresStopLoss: true, requiresTakeProfit: false, maxPositionPct: "",
  entryConditions: "", exitConditions: "", stopLossRule: "", takeProfitRule: "", riskRule: "", positionSizingRule: "", notes: "",
});

function StrategyLabPage() {
  const load = useServerFn(getStrategyLab);
  const remove = useServerFn(deleteStrategy);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["strategy-lab"], queryFn: () => load() });
  const [form, setForm] = useState<Form | null>(null);

  async function onDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Your journal entries stay saved.`)) return;
    try {
      await remove({ data: { id } });
      await qc.invalidateQueries({ queryKey: ["strategy-lab"] });
      toast.success("Strategy deleted.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-28 pt-2">
      <AppHeader title="Strategy Lab" subtitle="Simulation only. No real-money trading." />
      <DisclaimerNote text="Results below come only from your past simulated trades. They do not predict future results and are not investment advice." />

      <Button className="h-12 w-full rounded-xl" onClick={() => setForm(empty())}>
        <Plus className="mr-1 size-4" /> New strategy
      </Button>

      {q.isLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : q.isError ? (
        <p className="text-sm text-muted-foreground">Could not load strategies. Pull to refresh or try again.</p>
      ) : q.data!.strategies.length === 0 ? (
        <section className="bento-tile space-y-2 p-4 text-center">
          <FlaskConical className="mx-auto size-8 text-primary" aria-hidden />
          <p className="text-sm font-bold">No strategies yet</p>
          <p className="text-xs text-muted-foreground">
            Write down your rules, then type the strategy name in the "Strategy" field of a Trade Journal entry to see how
            your simulated trades with it performed.
          </p>
        </section>
      ) : (
        q.data!.strategies.map((s) => {
          const r = q.data!.results.find((x) => x.strategyId === s.id)!;
          return (
            <section key={s.id} className="bento-tile space-y-3 p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-bold">{s.name}</h2>
                  <p className="text-xs text-muted-foreground">{MARKET_LABEL[s.market] ?? s.market} · {s.timeframe}</p>
                </div>
                <Button size="icon" variant="ghost" aria-label="Edit strategy" onClick={() => {
                  trackEvent("strategy_reviewed");
                  setForm({
                    id: s.id, name: s.name, market: s.market, timeframe: s.timeframe,
                    requiresStopLoss: s.requires_stop_loss, requiresTakeProfit: s.requires_take_profit,
                    maxPositionPct: s.max_position_pct != null ? String(s.max_position_pct) : "",
                    entryConditions: s.entry_conditions ?? "", exitConditions: s.exit_conditions ?? "",
                    stopLossRule: s.stop_loss_rule ?? "", takeProfitRule: s.take_profit_rule ?? "",
                    riskRule: s.risk_rule ?? "", positionSizingRule: s.position_sizing_rule ?? "", notes: s.notes ?? "",
                  });
                }}>
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Delete strategy" onClick={() => onDelete(s.id, s.name)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {s.entry_conditions && <p className="text-xs"><span className="font-semibold">Entry:</span> {s.entry_conditions}</p>}
              {s.exit_conditions && <p className="text-xs"><span className="font-semibold">Exit:</span> {s.exit_conditions}</p>}
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Simulated performance</p>
              {r.trades === 0 ? (
                <p className="text-xs text-muted-foreground">No linked simulated trades yet. Add "{s.name}" in a Trade Journal entry.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Trades" value={`${r.trades}`} />
                  <Stat label="Win rate" value={`${r.winRate}%`} />
                  <Stat label="Net result" value={signedMoney(r.netPnl)} />
                  <Stat label="Avg result" value={signedMoney(r.avgPnl)} />
                  <Stat label="Best / Worst" value={`${signedMoney(r.best)} / ${signedMoney(r.worst)}`} />
                  <Stat label="Profit factor" value={r.profitFactor != null ? String(r.profitFactor) : "—"} />
                  <Stat label="Rules followed" value={`${r.ruleAdherence}%`} />
                  <Stat label="Completed" value={`${r.closed}`} />
                </div>
              )}
            </section>
          );
        })
      )}

      <StrategySheet form={form} setForm={setForm} />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-secondary/60 p-2 text-center">
      <p className="num truncate text-xs font-semibold">{value}</p>
      <p className="truncate text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function StrategySheet({ form, setForm }: { form: Form | null; setForm: (f: Form | null) => void }) {
  const save = useServerFn(saveStrategy);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => form && setForm({ ...form, [k]: v });

  async function submit() {
    if (!form) return;
    if (!form.name.trim()) return toast.error("Please give the strategy a name.");
    const pctNum = form.maxPositionPct ? Number(form.maxPositionPct) : null;
    if (pctNum != null && (!(pctNum > 0) || pctNum > 100)) return toast.error("Max position must be between 0 and 100%.");
    setBusy(true);
    try {
      const res = await save({
        data: {
          id: form.id, name: form.name, market: form.market as (typeof STRATEGY_MARKETS)[number],
          timeframe: form.timeframe as (typeof STRATEGY_TIMEFRAMES)[number],
          entryConditions: form.entryConditions, exitConditions: form.exitConditions, stopLossRule: form.stopLossRule,
          takeProfitRule: form.takeProfitRule, riskRule: form.riskRule, positionSizingRule: form.positionSizingRule,
          notes: form.notes, requiresStopLoss: form.requiresStopLoss, requiresTakeProfit: form.requiresTakeProfit,
          maxPositionPct: pctNum,
        },
      });
      if (res.created) trackEvent("strategy_created");
      await qc.invalidateQueries({ queryKey: ["strategy-lab"] });
      toast.success("Strategy saved.");
      setForm(null);
    } catch (e) {
      toast.error((e as Error).message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={!!form} onOpenChange={(o) => !o && setForm(null)}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>{form?.id ? "Edit strategy" : "New strategy"}</SheetTitle>
        </SheetHeader>
        {form && (
          <div className="space-y-3 p-4">
            <div>
              <Label>Strategy name</Label>
              <Input maxLength={60} value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label>Market</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {STRATEGY_MARKETS.map((m) => (
                  <Button key={m} size="sm" type="button" variant={form.market === m ? "default" : "outline"} onClick={() => set("market", m)}>
                    {MARKET_LABEL[m]}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Timeframe</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {STRATEGY_TIMEFRAMES.map((t) => (
                  <Button key={t} size="sm" type="button" variant={form.timeframe === t ? "default" : "outline"} onClick={() => set("timeframe", t)}>
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            {TEXT_FIELDS.map(([k, label, ph]) => (
              <div key={k}>
                <Label>{label}</Label>
                <Textarea maxLength={1000} placeholder={ph} value={form[k]} onChange={(e) => set(k, e.target.value)} className="mt-1.5 min-h-[56px] rounded-xl" />
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-3">
              <Label>Every trade needs a stop loss</Label>
              <Switch checked={form.requiresStopLoss} onCheckedChange={(v) => set("requiresStopLoss", v)} />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-3">
              <Label>Every trade needs a take profit</Label>
              <Switch checked={form.requiresTakeProfit} onCheckedChange={(v) => set("requiresTakeProfit", v)} />
            </div>
            <div>
              <Label>Max position size (% of virtual balance, optional)</Label>
              <Input inputMode="decimal" value={form.maxPositionPct} onChange={(e) => set("maxPositionPct", e.target.value)} className="mt-1.5 rounded-xl" />
            </div>
            <p className="text-[11px] text-muted-foreground">For simulated practice only. No strategy guarantees results.</p>
            <Button className="h-12 w-full rounded-xl" disabled={busy} onClick={submit}>Save strategy</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
