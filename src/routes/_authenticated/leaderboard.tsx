import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLeaderboard } from "@/lib/trading.functions";
import { AppHeader } from "@/components/AppHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — PaperEdge" },
      { name: "description", content: "See how your Trading Skill Score ranks against other paper traders." },
      { property: "og:title", content: "Leaderboard — PaperEdge" },
      { property: "og:description", content: "Ranked by Trading Skill Score, not luck." },
    ],
  }),
  component: LeaderboardPage,
});

type Period = "DAILY" | "WEEKLY" | "ALL_TIME";

function LeaderboardPage() {
  const load = useServerFn(getLeaderboard);
  const [period, setPeriod] = useState<Period>("ALL_TIME");
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => load({ data: { period } }),
  });

  return (
    <main>
      <AppHeader title="Leaderboard" subtitle="Ranked by Trading Skill Score" showSettings />

      <div className="space-y-4 p-5">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="DAILY">Daily</TabsTrigger>
            <TabsTrigger value="WEEKLY">Weekly</TabsTrigger>
            <TabsTrigger value="ALL_TIME">All time</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : !data?.rows.length ? (
          <EmptyState
            icon={Trophy}
            title="No ranked traders yet"
            description="Close a few simulated trades to appear on the leaderboard."
          />
        ) : (
          <ul className="space-y-2">
            {data.rows.map((r) => {
              const isMe = r.user_id === data.me;
              return (
                <li
                  key={r.user_id}
                  className={`surface-card flex items-center gap-3 p-3.5 ${isMe ? "border-primary/60" : ""}`}
                >
                  <span className="num w-7 text-center text-sm font-bold text-muted-foreground">{Number(r.rank)}</span>
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary">
                    {String(r.username).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {r.username} {isMe ? <span className="text-primary">(you)</span> : null}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Level {r.level}</p>
                  </div>
                  <span className="num text-sm font-semibold text-primary">{r.trading_skill_score}</span>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          Rankings reflect simulated performance only.
        </p>
      </div>
    </main>
  );
}
