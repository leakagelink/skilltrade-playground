import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCareerStatus } from "@/lib/career.functions";
import { AppHeader } from "@/components/AppHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { DisclaimerNote } from "@/components/Disclaimer";

export const Route = createFileRoute("/_authenticated/career/milestone/$id")({
  head: () => ({
    meta: [
      { title: "Career Milestone — TradeVirt" },
      {
        name: "description",
        content: "See the requirements, progress and educational goal behind a simulated trading career milestone.",
      },
      { property: "og:title", content: "Career Milestone — TradeVirt" },
      { property: "og:description", content: "Requirements and progress for a simulated trading career milestone." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MilestonePage,
});

function MilestonePage() {
  const { id } = useParams({ from: "/_authenticated/career/milestone/$id" });
  const load = useServerFn(getCareerStatus);
  const career = useQuery({ queryKey: ["career"], queryFn: () => load(), staleTime: 15_000 });

  const mission = career.data?.missions.find((m) => m.key === id);
  const percent = mission ? Math.round((mission.current / mission.target) * 100) : 0;

  return (
    <main>
      <AppHeader title="Career milestone" subtitle="Educational simulation goal" />

      <div className="space-y-4 p-5">
        {career.isLoading ? (
          <>
            <p className="text-sm text-muted-foreground">Checking progress…</p>
            <Skeleton className="h-40 w-full rounded-3xl" />
          </>
        ) : career.isError ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            We could not load this milestone. Please try again.
            <div className="mt-3">
              <Button size="sm" onClick={() => career.refetch()}>
                Retry
              </Button>
            </div>
          </div>
        ) : !mission ? (
          <div className="bento-tile space-y-3 p-4 text-sm">
            <p>This milestone does not exist.</p>
            <Button asChild size="sm">
              <Link to="/career">Back to career</Link>
            </Button>
          </div>
        ) : (
          <>
            <section className="bento-tile space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-lg font-extrabold tracking-tight">{mission.title}</h1>
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {mission.completed ? "Completed" : "In progress"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{mission.description}</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span>Progress</span>
                  <span className="num font-bold">
                    {mission.current}/{mission.target} ({percent}%)
                  </span>
                </div>
                <Progress value={percent} aria-label={`Milestone progress ${percent} percent`} className="h-2" />
              </div>
              <p className="text-xs text-muted-foreground">Reward: +{mission.rewardXp} XP (virtual, no cash value)</p>
            </section>

            <section className="bento-tile space-y-2 p-4">
              <h2 className="text-sm font-bold">Educational goal</h2>
              <p className="text-sm text-muted-foreground">{mission.goal}</p>
            </section>

            {mission.completed ? (
              <RewardedAdOffer
                placement="CAREER"
                title="Optional milestone bonus"
                onGranted={() => void career.refetch()}
              />
            ) : null}

            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                void showAdThenContinue("CAREER_MILESTONE_CONTINUE", () => navigate({ to: "/career" }))
              }
            >
              Continue
            </Button>
          </>
        )}

        <DisclaimerNote text="Milestones are calculated from your real activity in the simulator. All rewards are virtual and have no monetary value." />
      </div>
    </main>
  );
}
