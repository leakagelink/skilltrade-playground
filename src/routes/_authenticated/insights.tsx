import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAiInsights, requestTradeReview } from "@/lib/ai.functions";
import { getTrades } from "@/lib/trading.functions";
import { AppHeader } from "@/components/AppHeader";
import { RewardedAdOffer } from "@/components/ads/RewardedAdOffer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { DisclaimerNote } from "@/components/Disclaimer";
import { dateTime, signedMoney } from "@/lib/format";
import { Activity, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "AI Insights & Trader DNA — TradeVirt" },
      {
        name: "description",
        content:
          "Educational AI reviews of your completed simulated trades, your Trader DNA scores and a gamified trading personality summary.",
      },
      { property: "og:title", content: "AI Insights — TradeVirt" },
      { property: "og:description", content: "Trader DNA, trading personality and educational reviews of simulated trades." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InsightsPage,
});

const AI_DISCLAIMER =
  "AI-generated insights are based on simulated trading activity and are provided for educational and informational purposes only. They do not constitute financial, investment, or trading advice.";

const DNA_DISCLAIMER =
  "Trader DNA and Trading Personality are educational, gamified summaries based on simulated trading activity. They are not financial assessments, investment recommendations or psychological evaluations.";

const ACTIVITY_LABEL: Record<string, string> = {
  LOW: "Lower",
  MODERATE: "Moderate",
  HIGHER: "Higher",
};

function InsightsPage() {
  const qc = useQueryClient();
  const loadInsights = useServerFn(getAiInsights);
  const loadTrades = useServerFn(getTrades);
  const review = useServerFn(requestTradeReview);
  const [pending, setPending] = useState<string | null>(null);

  const insights = useQuery({ queryKey: ["ai-insights"], queryFn: () => loadInsights(), staleTime: 30_000 });
  const trades = useQuery({ queryKey: ["trades"], queryFn: () => loadTrades(), staleTime: 30_000 });

  const reviewedIds = useMemo(
    () => new Set((insights.data?.reviews ?? []).map((r) => r.tradeId)),
    [insights.data],
  );
  const reviewable = (trades.data?.trades ?? [])
    .filter((t) => t.status !== "OPEN" && !reviewedIds.has(String(t.id)))
    .slice(0, 5);

  const reviewMutation = useMutation({
    mutationFn: (tradeId: string) => review({ data: { tradeId } }),
    onMutate: (tradeId: string) => setPending(tradeId),
    onSettled: () => setPending(null),
    onSuccess: () => {
      toast.success("Educational review ready.");
      qc.invalidateQueries({ queryKey: ["ai-insights"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || "AI analysis is temporarily unavailable. Please try again later."),
  });

  const d = insights.data;
  const dna = d?.dna;

  const share = async () => {
    if (!dna) return;
    const text = [
      "MY TRADER DNA",
      "",
      `Risk Control: ${dna.riskControl}%`,
      `Discipline: ${dna.discipline}%`,
      `Consistency: ${dna.consistency}%`,
      `Patience: ${dna.patience}%`,
      "",
      `Trading Personality: ${dna.personality.toUpperCase()}`,
      "",
      "Based on simulated trading activity in TradeVirt — a paper trading simulator.",
    ].join("\n");
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "My Trader DNA — TradeVirt", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Trader DNA card copied.");
      }
    } catch {
      /* user cancelled the share sheet */
    }
  };

  return (
    <main>
      <AppHeader title="AI Insights" subtitle="Educational analysis of your simulated trading" />

      <div className="space-y-6 p-5">
        {insights.isLoading || !dna || !d ? (
          <>
            <Skeleton className="h-56 w-full rounded-3xl" />
            <Skeleton className="h-32 w-full rounded-3xl" />
          </>
        ) : (
          <>
            {/* Trader DNA */}
            <section>
              <div className="flex items-center justify-between">
                <p className="section-title">Your Trader DNA</p>
                <Button variant="ghost" size="sm" className="h-8 rounded-xl text-xs" onClick={share}>
                  <Share2 className="size-3.5" /> Share
                </Button>
              </div>
              <div className="bento-tile mt-2 space-y-3 p-4">
                {dna.hasEnoughData ? (
                  <>
                    <DnaBar label="Risk Control" value={dna.riskControl} />
                    <DnaBar label="Discipline" value={dna.discipline} />
                    <DnaBar label="Consistency" value={dna.consistency} />
                    <DnaBar label="Patience" value={dna.patience} />
                    <DnaBar label="Position Size Management" value={dna.positionSizeManagement} />
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-muted-foreground">Trading activity</span>
                      <span className="font-semibold">{ACTIVITY_LABEL[dna.activityLevel] ?? "Lower"}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Complete more simulated trading activity to generate your Trader DNA.
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">Calculated from your simulated trading activity.</p>
              </div>
            </section>

            {/* Trading personality */}
            <section>
              <p className="section-title">Trading Personality</p>
              <div className="brand-gradient brand-shadow mt-2 overflow-hidden rounded-[28px] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">Gamified summary</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight">{dna.personality}</p>
                <p className="mt-2 text-[11px] leading-relaxed opacity-85">{DNA_DISCLAIMER}</p>
              </div>
            </section>

            {/* Performance trend */}
            <section>
              <p className="section-title">Performance Trend</p>
              <div className="bento-tile mt-2 p-4">
                {d.comparison.hasEnoughData ? (
                  <div className="space-y-3">
                    <TrendRow
                      label="Consistency"
                      current={d.comparison.current.consistency}
                      previous={d.comparison.previous.consistency}
                    />
                    <TrendRow
                      label="Risk control"
                      current={d.comparison.current.riskControl}
                      previous={d.comparison.previous.riskControl}
                    />
                    <TrendRow
                      label="Discipline"
                      current={d.comparison.current.discipline}
                      previous={d.comparison.previous.discipline}
                    />
                    <TrendRow
                      label="Win rate"
                      current={d.comparison.current.winRate}
                      previous={d.comparison.previous.winRate}
                      suffix="%"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Last 7 days compared with the previous 7 days, based on available simulated trading activity.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Complete more simulated trading activity to generate a comparison.
                  </p>
                )}
              </div>
            </section>

            {/* Request a review */}
            {reviewable.length > 0 ? (
              <section>
                <p className="section-title">Analyse a closed simulated trade</p>
                <div className="mt-2 space-y-2">
                  {reviewable.map((t) => (
                    <div key={t.id} className="bento-tile flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {t.symbol} · {t.direction}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{dateTime(t.closed_at ?? t.opened_at)}</p>
                      </div>
                      <span
                        className={`num text-sm font-semibold ${Number(t.realized_pnl ?? 0) >= 0 ? "text-bull" : "text-bear"}`}
                      >
                        {signedMoney(Number(t.realized_pnl ?? 0))}
                      </span>
                      <Button
                        size="sm"
                        className="h-9 rounded-xl text-xs"
                        disabled={pending === String(t.id)}
                        onClick={() => reviewMutation.mutate(String(t.id))}
                      >
                        <Sparkles className="size-3.5" />
                        {pending === String(t.id) ? "Analysing…" : "Review"}
                      </Button>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground">
                    {d.usedToday} of {d.dailyLimit} educational AI reviews used in the last 24
                    hours.
                  </p>
                </div>
                <div className="mt-3">
                  <RewardedAdOffer
                    placement="AI_COACH"
                    title="Need one more analysis today?"
                    onGranted={() => void insights.refetch()}
                  />
                </div>
              </section>
            ) : null}

            {/* Recent AI insights */}
            <section>
              <p className="section-title">Recent AI Insights</p>
              <div className="mt-2 space-y-3">
                {d.reviews.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="No AI reviews yet"
                    description="Close a simulated trade and request an educational review to see it here."
                  />
                ) : (
                  d.reviews.map((r) => (
                    <article key={r.id} className="bento-tile space-y-3 p-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">
                          {r.symbol} · {r.direction}
                        </p>
                        <span
                          className={`num ml-auto text-sm font-semibold ${r.realizedPnl >= 0 ? "text-bull" : "text-bear"}`}
                        >
                          {signedMoney(r.realizedPnl)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{dateTime(r.createdAt)}</p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <ScorePill label="Risk" value={r.riskManagementScore} />
                        <ScorePill label="Discipline" value={r.disciplineScore} />
                        <ScorePill label="Timing" value={r.timingScore} />
                        <ScorePill label="Consistency" value={r.consistencyScore} />
                      </div>
                      <p className="text-sm leading-relaxed">{r.summary}</p>
                      {r.strengths.length ? <Bullets title="Strengths" items={r.strengths} /> : null}
                      {r.areasToReview.length ? <Bullets title="Areas to review" items={r.areasToReview} /> : null}
                      {r.detectedPatterns.length ? <Bullets title="Observed patterns" items={r.detectedPatterns} /> : null}
                      {r.educationalNote ? (
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{r.educationalNote}</p>
                      ) : null}
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Based on your simulated trading activity.
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        <DisclaimerNote text={AI_DISCLAIMER} />
      </div>
    </main>
  );
}

function DnaBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="num font-semibold">{value}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function TrendRow({
  label,
  current,
  previous,
  suffix = "",
}: {
  label: string;
  current: number;
  previous: number;
  suffix?: string;
}) {
  const delta = Math.round((current - previous) * 10) / 10;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="num text-xs text-muted-foreground">
        {previous}
        {suffix}
      </span>
      <span className="num font-semibold">
        {current}
        {suffix}
      </span>
      <span className={`num w-16 text-right text-xs font-semibold ${delta >= 0 ? "text-bull" : "text-bear"}`}>
        {delta >= 0 ? "+" : ""}
        {delta}
      </span>
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-secondary/70 px-2 py-2">
      <p className="num text-base font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-relaxed">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
