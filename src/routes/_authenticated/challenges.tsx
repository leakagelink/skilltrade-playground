import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBadges, getChallenges } from "@/lib/trading.functions";
import { AppHeader } from "@/components/AppHeader";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Award, CheckCircle2, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/challenges")({
  head: () => ({
    meta: [
      { title: "Challenges & Badges — TradeVirt" },
      { name: "description", content: "Complete daily and weekly trading challenges to earn XP, credits and badges." },
      { property: "og:title", content: "Challenges — TradeVirt" },
      { property: "og:description", content: "Daily and weekly challenges that reward disciplined practice." },
    ],
  }),
  component: ChallengesPage,
});

function ChallengesPage() {
  const loadChallenges = useServerFn(getChallenges);
  const loadBadges = useServerFn(getBadges);
  const challenges = useQuery({ queryKey: ["challenges"], queryFn: () => loadChallenges() });
  const badges = useQuery({ queryKey: ["badges"], queryFn: () => loadBadges() });

  const daily = (challenges.data?.challenges ?? []).filter((c) => c.type === "DAILY");
  const weekly = (challenges.data?.challenges ?? []).filter((c) => c.type === "WEEKLY");

  return (
    <main>
      <AppHeader title="Challenges" subtitle="Practice with purpose" showSettings />

      <div className="space-y-6 p-5">
        {challenges.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : challenges.data?.challenges.length === 0 ? (
          <EmptyState icon={Target} title="No active challenges" description="New challenges appear here regularly." />
        ) : (
          <>
            <Section title="Daily" items={daily} />
            <Section title="Weekly" items={weekly} />
          </>
        )}

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Badges</h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {(badges.data?.badges ?? []).map((b) => (
              <div
                key={b.id}
                className={`surface-card flex flex-col items-center gap-2 p-3 text-center ${
                  b.earnedAt ? "" : "opacity-40"
                }`}
              >
                <Award className={`size-6 ${b.earnedAt ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-[11px] font-semibold leading-tight">{b.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

type Item = {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardXp: number;
  rewardCredits: number;
  progress: number;
  status: string;
};

function Section({ title, items }: { title: string; items: Item[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <ul className="mt-3 space-y-3">
        {items.map((c) => {
          const done = c.status === "COMPLETED";
          const value = Math.min(100, (c.progress / Math.max(c.target, 1)) * 100);
          return (
            <li key={c.id} className="surface-card p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{c.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>
                </div>
                {done ? <CheckCircle2 className="size-5 shrink-0 text-bull" /> : null}
              </div>
              <Progress value={value} className="mt-3 h-2" />
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="num">
                  {Math.min(c.progress, c.target)} / {c.target}
                </span>
                <span>
                  +{c.rewardXp} XP{c.rewardCredits ? ` · +${c.rewardCredits} credits` : ""}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
