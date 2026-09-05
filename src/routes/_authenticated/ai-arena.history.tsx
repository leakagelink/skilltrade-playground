import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History, Swords } from "lucide-react";
import { getArenaHistory } from "@/lib/arena.functions";
import { arenaBot } from "@/lib/arena/bots";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { DisclaimerNote } from "@/components/Disclaimer";
import { pct, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/ai-arena/history")({
  head: () => ({
    meta: [
      { title: "AI Arena history — TradeVirt" },
      {
        name: "description",
        content: "Review your completed simulated AI Arena challenges, returns and final Arena Scores.",
      },
      { property: "og:title", content: "AI Arena history — TradeVirt" },
      { property: "og:description", content: "Your past simulated AI Arena challenge results." },
    ],
  }),
  component: ArenaHistoryPage,
});

const STATUS_TONE: Record<string, string> = {
  USER: "text-bull",
  AI: "text-bear",
};

function ArenaHistoryPage() {
  const load = useServerFn(getArenaHistory);
  const { data, isLoading } = useQuery({ queryKey: ["arena-history"], queryFn: () => load(), staleTime: 30_000 });

  return (
    <main className="pb-28">
      <AppHeader title="Arena history" />
      <section className="space-y-3 px-5 pt-2">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full rounded-3xl" />
            <Skeleton className="h-24 w-full rounded-3xl" />
          </>
        ) : (data?.sessions.length ?? 0) === 0 ? (
          <EmptyState
            icon={History}
            title="No AI Arena challenges yet."
            description="Start a simulated challenge against an AI opponent to build your Arena record."
            action={
              <Button asChild className="rounded-2xl">
                <Link to="/ai-arena">
                  <Swords className="size-4" /> Challenge an AI
                </Link>
              </Button>
            }
          />
        ) : (
          data?.sessions.map((s) => {
            const bot = arenaBot(s.botId);
            const label =
              s.status === "ACTIVE"
                ? "ACTIVE"
                : s.winner === "USER"
                  ? "WON"
                  : s.winner === "AI"
                    ? "LOST"
                    : "DRAW";
            return (
              <article key={s.id} className="bento-tile p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold tracking-tight">You vs {bot?.name ?? s.botId.toUpperCase()}</h2>
                  <span
                    className={`rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      STATUS_TONE[s.winner ?? ""] ?? "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {shortDate(s.startTime)} — {shortDate(s.endTime)}
                </p>
                <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
                  <Cell label="Your return" value={s.userReturn == null ? "—" : pct(s.userReturn)} />
                  <Cell label="AI return" value={s.aiReturn == null ? "—" : pct(s.aiReturn)} />
                  <Cell label="Your score" value={s.userScore == null ? "—" : String(s.userScore)} />
                  <Cell label="AI score" value={s.aiScore == null ? "—" : String(s.aiScore)} />
                </div>
                {s.summary ? (
                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{s.summary}</p>
                ) : null}
              </article>
            );
          })
        )}

        <DisclaimerNote text="AI Arena results are simulated outcomes using virtual funds. They have no monetary value and are not a record of real trading performance." />
      </section>
    </main>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="num font-semibold">{value}</p>
    </div>
  );
}
