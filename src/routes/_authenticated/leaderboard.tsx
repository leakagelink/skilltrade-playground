import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLeaderboard } from "@/lib/trading.functions";
import { getSocialLeaderboard } from "@/lib/compete.functions";
import {
  followUser,
  getMySocialSummary,
  getSeasonLeaderboard,
  unfollowUser,
} from "@/lib/social.functions";
import { COUNTRIES } from "@/lib/compete/config";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Trophy, UserCheck, UserPlus, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — TradeVirt" },
      { name: "description", content: "See how your Trading Skill Score ranks against other paper traders." },
      { property: "og:title", content: "Leaderboard — TradeVirt" },
      { property: "og:description", content: "Ranked by Trading Skill Score, not luck." },
    ],
  }),
  component: LeaderboardPage,
});

type Period = "DAILY" | "WEEKLY" | "ALL_TIME";

function LeaderboardPage() {
  const load = useServerFn(getLeaderboard);
  useEffect(() => {
    void trackEvent("leaderboard_viewed");
  }, []);
  const [period, setPeriod] = useState<Period>("ALL_TIME");
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => load({ data: { period } }),
  });

  return (
    <main>
      <AppHeader title="Leaderboard" subtitle="Ranked by Trading Skill Score" showSettings />

      <div className="space-y-4 p-5">
        <Link to="/compete" className="surface-card flex items-center justify-between gap-3 p-4">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Users className="size-4 text-primary" /> Compete with friends
            </p>
            <p className="text-[11px] text-muted-foreground">
              Friend challenges, open challenges and weekly tournaments — virtual funds only.
            </p>
          </div>
          <Button size="sm" variant="secondary">Open</Button>
        </Link>

        <GlobalRanks />

        <SeasonBoard />


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

/** Version 1.4 global / country ranking of traders who opted into a public profile. */
function GlobalRanks() {
  const load = useServerFn(getSocialLeaderboard);
  const loadSummary = useServerFn(getMySocialSummary);
  const doFollow = useServerFn(followUser);
  const doUnfollow = useServerFn(unfollowUser);
  const queryClient = useQueryClient();
  const [country, setCountry] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const { data: summary } = useQuery({
    queryKey: ["social-summary"],
    queryFn: () => loadSummary(),
    staleTime: 30_000,
  });
  const followingSet = new Set(summary?.followingUsernames ?? []);
  const { data, isLoading } = useQuery({
    queryKey: ["social-leaderboard", country],
    queryFn: () => load({ data: { country: country || null, page: 0 } }),
    staleTime: 60_000,
  });

  return (
    <section className="surface-card space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Global & country ranks</p>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="h-9 rounded-xl border border-border bg-background px-2 text-xs"
        >
          <option value="">Global</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : !data?.rows.length ? (
        <p className="text-xs text-muted-foreground">
          No public traders here yet. Turn on a public profile in Settings to appear.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {data.rows.map((r) => {
            const isFollowing = followingSet.has(String(r.username));
            return (
              <li key={r.user_id} className="flex items-center gap-2 border-t border-border/60 pt-1.5 text-xs">
                <span className="num w-5 shrink-0 text-muted-foreground">{r.rank}</span>
                <Link
                  to="/trader/$username"
                  params={{ username: String(r.username) }}
                  className="min-w-0 flex-1 truncate font-semibold underline-offset-2 hover:underline"
                >
                  {r.username}
                  {r.country ? <span className="ml-1 text-muted-foreground">· {r.country}</span> : null}
                </Link>
                <span className="shrink-0 text-muted-foreground">Lv {r.level}</span>
                <span className="num shrink-0 font-semibold text-primary">{r.trading_skill_score}</span>
                {r.user_id === data.me ? null : (
                  <button
                    type="button"
                    disabled={busy === r.username}
                    onClick={async () => {
                      setBusy(String(r.username));
                      try {
                        if (isFollowing) {
                          await doUnfollow({ data: { username: String(r.username) } });
                        } else {
                          await doFollow({ data: { username: String(r.username) } });
                        }
                        await queryClient.invalidateQueries({ queryKey: ["social-summary"] });
                      } catch {
                        // Private profile or network issue — nothing to do here.
                      } finally {
                        setBusy(null);
                      }
                    }}
                    className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
                      isFollowing ? "bg-secondary text-muted-foreground" : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {isFollowing ? <UserCheck className="size-3" /> : <UserPlus className="size-3" />}
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground">
        Only traders who chose a public profile appear here. Emails and private trades are never shown.
      </p>
    </section>
  );
}

/** Version 3 seasonal leaderboard — season points come from XP and challenges, never from simulated profit. */
type SeasonRow = {
  rank: number;
  user_id: string;
  username: string;
  level: number;
  xp_in_season: number;
  challenges_completed: number;
  season_points: number;
};

function SeasonBoard() {
  const load = useServerFn(getSeasonLeaderboard);
  const { data, isLoading } = useQuery({
    queryKey: ["season-leaderboard"],
    queryFn: () => load(),
    staleTime: 60_000,
  });

  return (
    <section className="surface-card space-y-3 p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Trophy className="size-4 text-primary" /> Season — {data?.seasonLabel ?? "this month"}
      </p>

      {isLoading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : !data?.rows.length ? (
        <p className="text-xs text-muted-foreground">
          Season ranks are still empty. Earn XP and complete challenges this month to appear.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {(data.rows as SeasonRow[]).map((r) => (
            <li key={r.user_id} className="flex items-center gap-2 border-t border-border/60 pt-1.5 text-xs">
              <span className="num w-5 shrink-0 text-muted-foreground">{String(r.rank)}</span>
              <Link
                to="/trader/$username"
                params={{ username: r.username }}
                className="min-w-0 flex-1 truncate font-semibold underline-offset-2 hover:underline"
              >
                {r.username}
                {r.user_id === data.me ? <span className="ml-1 text-primary">(you)</span> : null}
              </Link>
              <span className="shrink-0 text-muted-foreground">{String(r.xp_in_season)} XP</span>
              <span className="num shrink-0 font-semibold text-primary">{String(r.season_points)} pts</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground">
        Season points come from XP earned and challenges completed this month — never from simulated
        profit. Public profiles only.
      </p>
    </section>
  );
}
