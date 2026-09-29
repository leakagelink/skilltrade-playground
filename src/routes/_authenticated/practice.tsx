import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPracticeOverview, saveJournal } from "@/lib/practice.functions";
import { AppHeader } from "@/components/AppHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DisclaimerNote } from "@/components/Disclaimer";
import { signedMoney, dateTime } from "@/lib/format";
import { isDecisionCheckEnabled, setDecisionCheckEnabled } from "@/lib/decision-check";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { Flame, BookOpen, Trophy, BarChart3, Lightbulb, ListChecks, History, Check, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({
    meta: [
      { title: "Practice Center — TradeVirt" },
      { name: "description", content: "Trade journal, weekly practice summary, milestones and practice streak for your simulated trading." },
      { property: "og:title", content: "Practice Center — TradeVirt" },
      { property: "og:description", content: "Reflect on and improve your simulated trading practice." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PracticePage,
});

const EMOTIONS = ["Calm", "Confident", "Unsure", "Impulsive", "Patient"] as const;

function Section({ icon: Icon, title, children }: { icon: typeof Flame; title: string; children: React.ReactNode }) {
  return (
    <section className="bento-tile space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" aria-hidden />
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 text-center">
      <p className="num truncate text-sm font-semibold">{value}</p>
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function PracticePage() {
  const load = useServerFn(getPracticeOverview);
  const q = useQuery({ queryKey: ["practice"], queryFn: () => load() });
  const [checkOn, setCheckOn] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    setCheckOn(isDecisionCheckEnabled());
    trackEvent("practice_center_opened");
  }, []);
  useEffect(() => {
    if (q.data) trackEvent("practice_summary_viewed");
  }, [q.data]);

  const d = q.data;

  return (
    <main>
      <AppHeader title="Practice Center" subtitle="Simulation only. No real-money trading." />
      <div className="space-y-4 p-5">
        {!d ? (
          <Skeleton className="h-64 w-full rounded-3xl" />
        ) : (
          <>
            <Section icon={Flame} title="Practice Streak">
              <p className="text-2xl font-extrabold">
                {d.streak.current} Day Practice Streak
              </p>
              <p className="text-xs text-muted-foreground">
                Best: {d.streak.best} days. A day counts when you open or close a simulated trade, complete a challenge or write a journal entry. Missing a full day resets the streak to 0.
                {d.streak.activeToday ? " Today already counts." : ""}
              </p>
            </Section>

            <Section icon={BarChart3} title="Weekly Practice Summary">
              <div className="grid grid-cols-3 gap-y-4">
                <Stat label="Opened" value={String(d.weekly.opened)} />
                <Stat label="Closed" value={String(d.weekly.closed)} />
                <Stat label="Win rate" value={`${d.weekly.winRate}%`} />
                <Stat label="Avg result" value={signedMoney(d.weekly.avgResult)} />
                <Stat label="Most traded" value={d.weekly.mostTraded ?? "—"} />
                <Stat label="Challenges" value={String(d.weekly.challengesCompleted)} />
                <Stat label="Stop loss use" value={`${d.weekly.slUsage}%`} />
                <Stat label="Take profit use" value={`${d.weekly.tpUsage}%`} />
                <Stat label="Streak" value={`${d.streak.current}d`} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Last 7 days. These insights are based only on your simulated activity and are not financial advice.
              </p>
            </Section>

            <Section icon={Lightbulb} title="Practice Insights">
              {d.insights.length === 0 ? (
                <p className="text-xs text-muted-foreground">Complete a few simulated trades to see objective practice insights.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-4 text-xs">
                  {d.insights.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-muted-foreground">
                Review your own strategy and risk preferences before making real-world financial decisions.
              </p>
            </Section>

            <Section icon={Trophy} title="Milestones">
              <div className="grid grid-cols-2 gap-2">
                {d.milestones.map((m) => (
                  <div key={m.key} className={`rounded-xl border border-border p-2.5 ${m.done ? "" : "opacity-50"}`}>
                    <div className="flex items-center gap-1.5">
                      {m.done ? <Check className="size-3.5 text-bull" /> : <Lock className="size-3.5" />}
                      <p className="truncate text-xs font-semibold">{m.name}</p>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{m.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Milestones are virtual only and have no cash or real-world monetary value.
              </p>
            </Section>

            <Section icon={BookOpen} title="Trade Journal">
              <p className="text-xs text-muted-foreground">
                Use your trade journal to review simulated decisions and improve your practice. Entries are private to you.
              </p>
              {d.reviewable.length === 0 ? (
                <p className="text-xs text-muted-foreground">Close a simulated trade to review it here.</p>
              ) : (
                <div className="space-y-2">
                  {d.reviewable.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setEditing(t.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{t.symbol} · {t.direction}</p>
                        <p className="text-[11px] text-muted-foreground">{t.closedAt ? dateTime(t.closedAt) : ""}</p>
                      </div>
                      <span className={`num text-xs ${t.pnl >= 0 ? "text-bull" : "text-bear"}`}>{signedMoney(t.pnl)}</span>
                      <span className="text-[11px] font-semibold text-primary">{t.hasJournal ? "Edit" : "Review"}</span>
                    </button>
                  ))}
                </div>
              )}
            </Section>

            <Section icon={ListChecks} title="Decision Check">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Show an optional "Check Your Trade Plan" reflection list before simulated BUY/SELL. It never blocks trading.
                </p>
                <Switch
                  checked={checkOn}
                  onCheckedChange={(v) => {
                    setCheckOn(v);
                    setDecisionCheckEnabled(v);
                    if (v) trackEvent("decision_check_enabled");
                  }}
                  aria-label="Enable decision check"
                />
              </div>
            </Section>

            <Section icon={History} title="Market Replay">
              <p className="text-xs text-muted-foreground">
                Market Replay is currently unavailable while historical market data support is being prepared.
              </p>
            </Section>
          </>
        )}
        <DisclaimerNote text="Simulation only. No real-money trading. Virtual funds have no real-world monetary value. Educational and practice purposes only." />
      </div>
      <JournalSheet tradeId={editing} journals={d?.journals ?? []} onClose={() => setEditing(null)} />
    </main>
  );
}

type Journal = {
  trade_id: string; thesis: string | null; strategy: string | null; entry_reason: string | null;
  exit_reason: string | null; went_well: string | null; improve: string | null; notes: string | null;
  emotion: string | null; confidence: number | null;
};

const FIELDS: [keyof Journal, string][] = [
  ["thesis", "Why did you take this trade?"],
  ["strategy", "Strategy"],
  ["entry_reason", "Entry reason"],
  ["exit_reason", "Exit reason"],
  ["went_well", "What went well?"],
  ["improve", "What could be improved?"],
  ["notes", "Notes (optional)"],
];

function JournalSheet({ tradeId, journals, onClose }: { tradeId: string | null; journals: Journal[]; onClose: () => void }) {
  const save = useServerFn(saveJournal);
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [emotion, setEmotion] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const existing = journals.find((j) => j.trade_id === tradeId);

  useEffect(() => {
    if (!tradeId) return;
    const f: Record<string, string> = {};
    FIELDS.forEach(([k]) => (f[k] = (existing?.[k] as string | null) ?? ""));
    setForm(f);
    setEmotion(existing?.emotion ?? null);
    setConfidence(existing?.confidence ?? null);
    if (existing) trackEvent("trade_journal_reviewed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId]);

  async function submit() {
    if (!tradeId) return;
    setBusy(true);
    try {
      await save({
        data: {
          tradeId,
          thesis: form.thesis, strategy: form.strategy, entryReason: form.entry_reason,
          exitReason: form.exit_reason, wentWell: form.went_well, improve: form.improve, notes: form.notes,
          emotion: emotion as (typeof EMOTIONS)[number] | null, confidence,
        },
      });
      trackEvent(existing ? "trade_journal_reviewed" : "trade_journal_created");
      await qc.invalidateQueries({ queryKey: ["practice"] });
      toast.success("Journal saved.");
      onClose();
    } catch (e) {
      toast.error((e as Error).message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={!!tradeId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Review this simulated trade</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 p-4">
          {FIELDS.map(([k, label]) => (
            <div key={k}>
              <Label>{label}</Label>
              <Textarea
                maxLength={1000}
                value={form[k] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                className="mt-1.5 min-h-[60px] rounded-xl"
              />
            </div>
          ))}
          <div>
            <Label>How did you feel before the trade?</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {EMOTIONS.map((e) => (
                <Button key={e} size="sm" type="button" variant={emotion === e ? "default" : "outline"} onClick={() => setEmotion(emotion === e ? null : e)}>
                  {e}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Confidence (1–5)</Label>
            <div className="mt-1.5 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button key={n} size="sm" type="button" variant={confidence === n ? "default" : "outline"} onClick={() => setConfidence(confidence === n ? null : n)}>
                  {n}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">For simulated trades only. Not investment advice.</p>
          <Button className="h-12 w-full rounded-xl" disabled={busy} onClick={submit}>
            Save journal
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
