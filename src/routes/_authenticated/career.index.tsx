import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCareerStatus, selectSpecialization } from "@/lib/career.functions";
import { AppHeader } from "@/components/AppHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/EmptyState";
import { DisclaimerNote, SimulationBadge } from "@/components/Disclaimer";
import { Check, ChevronRight, CircleDashed, Compass, Lock, Rocket, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/career/")({
  head: () => ({
    meta: [
      { title: "Trading Career — TradeVirt" },
      {
        name: "description",
        content:
          "Follow a structured, educational career journey through simulated trading stages, missions and learning paths.",
      },
      { property: "og:title", content: "Trading Career — TradeVirt" },
      { property: "og:description", content: "Progress through educational simulated trading stages and missions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CareerPage,
});

function CareerPage() {
  const load = useServerFn(getCareerStatus);
  const choose = useServerFn(selectSpecialization);
  const qc = useQueryClient();

  const career = useQuery({ queryKey: ["career"], queryFn: () => load(), staleTime: 15_000 });

  const pick = useMutation({
    mutationFn: (specialization: string) => choose({ data: { specialization } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["career"] }),
  });

  const d = career.data;

  return (
    <main>
      <AppHeader title="Trading Career" subtitle="Your educational simulation journey" />

      <div className="space-y-5 p-5">
        {career.isLoading ? (
          <>
            <p className="text-sm text-muted-foreground">Loading career…</p>
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </>
        ) : career.isError || !d ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            We could not load your career progress right now. Please check your connection and try again.
            <div className="mt-3">
              <Button size="sm" onClick={() => career.refetch()}>
                Retry
              </Button>
            </div>
          </div>
        ) : !d.hasActivity ? (
          <EmptyState
            icon={Rocket}
            title="Your trading journey starts here"
            description="Complete your first simulated trade to begin your Career. Progress is calculated from your real activity in the simulator."
            action={
              <Button asChild size="sm">
                <Link to="/trade">Start trading</Link>
              </Button>
            }
          />
        ) : (
          <>
            {/* Current career */}
            <section className="brand-gradient brand-shadow relative overflow-hidden rounded-[28px] p-5">
              <div className="pointer-events-none absolute -right-14 -top-16 size-48 rounded-full bg-primary-foreground/15 blur-2xl" />
              <div className="relative space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider opacity-75">Current career</p>
                  <SimulationBadge />
                </div>
                <p className="text-2xl font-extrabold tracking-tight">{d.currentStageName}</p>
                <p className="text-xs opacity-85">Title: {d.careerTitle}</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span>{d.nextStage ? `Progress to ${d.nextStage}` : "Journey complete"}</span>
                    <span className="num font-bold">{d.progressPercent}%</span>
                  </div>
                  <Progress
                    value={d.progressPercent}
                    aria-label={`Career progress ${d.progressPercent} percent`}
                    className="h-2 bg-primary-foreground/25"
                  />
                </div>
              </div>
            </section>

            {/* Next stage requirements */}
            {(() => {
              const current = d.stages.find((s) => s.state === "CURRENT");
              if (!current) return null;
              return (
                <section className="bento-tile space-y-3 p-4">
                  <h2 className="text-sm font-bold">Next unlock: {current.name}</h2>
                  <p className="text-xs text-muted-foreground">{current.description}</p>
                  <ul className="space-y-2">
                    {current.requirements.map((r) => (
                      <li key={r.label} className="flex items-start gap-2 text-sm">
                        {r.done ? (
                          <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                        ) : (
                          <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                        )}
                        <span className={r.done ? "text-muted-foreground line-through" : ""}>
                          {r.label}{" "}
                          <span className="num text-xs text-muted-foreground">
                            ({Math.min(r.current, r.target)}/{r.target}) — {r.done ? "completed" : "in progress"}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })()}

            {/* Career map */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold">Career map</h2>
              <ol className="space-y-2">
                {d.stages.map((s) => (
                  <li key={s.key}>
                    <div className="bento-tile flex items-center gap-3 p-3">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                        {s.state === "COMPLETED" ? (
                          <Trophy className="size-4 text-primary" aria-hidden />
                        ) : s.state === "CURRENT" ? (
                          <Compass className="size-4 text-primary" aria-hidden />
                        ) : (
                          <Lock className="size-4" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {s.name}{" "}
                          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            {s.state === "COMPLETED" ? "Completed" : s.state === "CURRENT" ? "Current" : "Locked"}
                          </span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">Title: {s.title}</p>
                      </div>
                      <span className="num text-xs font-bold text-muted-foreground">{s.progress}%</span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Missions */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold">Career missions</h2>
              {d.missions.map((m) => (
                <Link
                  key={m.key}
                  to="/career/milestone/$id"
                  params={{ id: m.key }}
                  className="bento-tile flex items-center gap-3 p-3"
                  aria-label={`Open mission ${m.title}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {m.title}{" "}
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {m.completed ? "Completed" : "In progress"}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{m.description}</p>
                    <p className="num text-[11px] text-muted-foreground">
                      {m.current}/{m.target} · +{m.rewardXp} XP
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              ))}
            </section>

            {/* Specializations */}
            <section className="space-y-2">
              <h2 className="text-sm font-bold">Learning paths</h2>
              <p className="text-xs text-muted-foreground">
                Simulation specializations are educational focus areas only. They do not restrict any part of the app
                and are not a professional qualification.
              </p>
              {d.specializations.map((s) => (
                <div key={s.key} className="bento-tile space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{s.name}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {s.selected ? "Selected" : s.unlocked ? "Unlocked" : "Locked"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                  {s.unlocked ? (
                    <Button
                      size="sm"
                      variant={s.selected ? "secondary" : "default"}
                      disabled={s.selected || pick.isPending}
                      onClick={() => pick.mutate(s.key)}
                      aria-label={`Choose learning path ${s.name}`}
                    >
                      {s.selected ? "Current path" : pick.isPending ? "Saving…" : "Choose path"}
                    </Button>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Unlocks at career stage {s.unlockStage.replace("_", " ").toLowerCase()}.
                    </p>
                  )}
                </div>
              ))}
              {pick.isError ? (
                <p className="text-xs text-destructive">This learning path is not available yet.</p>
              ) : null}
            </section>
          </>
        )}

        <DisclaimerNote text="Career Mode is an educational progression system for simulated trading only. Stages, titles and achievements are virtual, have no monetary value and cannot be transferred or exchanged." />
      </div>
    </main>
  );
}
