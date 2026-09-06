import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Loader2, Trophy, Users } from "lucide-react";
import {
  cancelCompetition,
  createFriendChallenge,
  getCompeteOverview,
  joinByInviteCode,
  joinCompetition,
} from "@/lib/compete.functions";
import {
  BALANCE_PRESETS,
  COMPETITION_DISCLOSURES,
  DURATION_PRESETS,
  MARKET_CATEGORIES,
  statusLabel,
  type MarketCategory,
} from "@/lib/compete/config";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/compete/")({
  head: () => ({
    meta: [
      { title: "Compete — TradeVirt" },
      {
        name: "description",
        content:
          "Challenge friends, join open challenges and weekly tournaments in simulated trading competitions with virtual funds only.",
      },
      { property: "og:title", content: "Compete — TradeVirt" },
      {
        property: "og:description",
        content: "Friend challenges, open challenges and weekly tournaments — simulated trading, no real money.",
      },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const qc = useQueryClient();
  const load = useServerFn(getCompeteOverview);
  const create = useServerFn(createFriendChallenge);
  const join = useServerFn(joinCompetition);
  const joinCode = useServerFn(joinByInviteCode);
  const cancel = useServerFn(cancelCompetition);

  const [durationDays, setDurationDays] = useState<number>(3);
  const [startingBalance, setStartingBalance] = useState<number>(100000);
  const [marketCategory, setMarketCategory] = useState<MarketCategory>("ALL");
  const [code, setCode] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["compete-overview"],
    queryFn: () => load(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["compete-overview"] });

  const createMutation = useMutation({
    mutationFn: () => create({ data: { durationDays, startingBalance, marketCategory } }),
    onSuccess: (res) => {
      toast.success("Challenge created. Share the invite code with a friend.");
      invalidate();
      if (res.competition.inviteCode) void copyInvite(res.competition.inviteCode);
    },
    onError: (e: Error) => toast.error(e.message || "Could not create the challenge."),
  });

  const joinMutation = useMutation({
    mutationFn: (competitionId: string) => join({ data: { competitionId } }),
    onSuccess: () => {
      toast.success("You joined the simulated competition.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not join."),
  });

  const codeMutation = useMutation({
    mutationFn: () => joinCode({ data: { code } }),
    onSuccess: () => {
      toast.success("Invitation accepted.");
      setCode("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "That invitation is not valid."),
  });

  const cancelMutation = useMutation({
    mutationFn: (competitionId: string) => cancel({ data: { competitionId } }),
    onSuccess: () => {
      toast.success("Challenge cancelled.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not cancel."),
  });

  async function copyInvite(inviteCode: string) {
    const url = `${window.location.origin}/compete/join/${inviteCode}`;
    const text = `Join my simulated TradeVirt trading challenge (virtual funds only): ${url}`;
    try {
      if (navigator.share) await navigator.share({ title: "TradeVirt challenge", text, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Invite link copied.");
      }
    } catch {
      /* the user dismissed the share sheet */
    }
  }

  return (
    <main>
      <AppHeader title="Compete" subtitle="Simulated challenges with friends and the community" showSettings />

      <div className="space-y-5 p-5">
        <Tabs defaultValue="mine">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mine">Mine</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="friend">Friends</TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="space-y-3 pt-4">
            {isLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : !data?.mine.length ? (
              <p className="surface-card p-4 text-sm text-muted-foreground">
                You have not joined a competition yet. Open a public challenge or invite a friend.
              </p>
            ) : (
              data.mine.map((c) => (
                <div key={c.id} className="surface-card space-y-2 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{c.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {statusLabel(c.status)} · {money(c.startingBalance)} virtual · {c.durationDays}d
                      </p>
                    </div>
                    <Link to="/compete/$id" params={{ id: c.id }}>
                      <Button size="sm" variant="secondary">
                        Open
                      </Button>
                    </Link>
                  </div>
                  {c.myRank ? (
                    <p className="text-xs text-muted-foreground">
                      Your rank #{c.myRank} · score {c.myScore ?? "—"} · return {c.myReturn ?? 0}%
                    </p>
                  ) : null}
                  {c.status === "WAITING_FOR_OPPONENT" && c.inviteCode ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => void copyInvite(c.inviteCode!)}>
                        <Copy className="mr-1 size-3.5" /> Share invite
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelMutation.mutate(c.id)}
                        disabled={cancelMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="open" className="space-y-3 pt-4">
            {isLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : !data?.open.length ? (
              <p className="surface-card p-4 text-sm text-muted-foreground">
                You are already in every open competition. New ones start automatically.
              </p>
            ) : (
              data.open.map((c) => (
                <div key={c.id} className="surface-card flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                      {c.kind === "TOURNAMENT" ? (
                        <Trophy className="size-4 text-primary" />
                      ) : (
                        <Users className="size-4 text-primary" />
                      )}
                      {c.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {money(c.startingBalance)} virtual · {c.durationDays} days · everyone starts equal
                    </p>
                  </div>
                  <Button size="sm" onClick={() => joinMutation.mutate(c.id)} disabled={joinMutation.isPending}>
                    {joinMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Join"}
                  </Button>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="friend" className="space-y-4 pt-4">
            <div className="surface-card space-y-3 p-4">
              <p className="text-sm font-semibold">Create a friend challenge</p>
              <Row label="Duration">
                {DURATION_PRESETS.map((d) => (
                  <Chip key={d} active={durationDays === d} onClick={() => setDurationDays(d)}>
                    {d} day{d > 1 ? "s" : ""}
                  </Chip>
                ))}
              </Row>
              <Row label="Virtual balance">
                {BALANCE_PRESETS.map((b) => (
                  <Chip key={b} active={startingBalance === b} onClick={() => setStartingBalance(b)}>
                    {money(b)}
                  </Chip>
                ))}
              </Row>
              <Row label="Markets">
                {MARKET_CATEGORIES.map((m) => (
                  <Chip key={m.value} active={marketCategory === m.value} onClick={() => setMarketCategory(m.value)}>
                    {m.label}
                  </Chip>
                ))}
              </Row>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Create challenge
              </Button>
            </div>

            <div className="surface-card space-y-3 p-4">
              <p className="text-sm font-semibold">Have an invite code?</p>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123XYZ"
                  className="num"
                />
                <Button onClick={() => codeMutation.mutate()} disabled={codeMutation.isPending || code.length < 6}>
                  Join
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="surface-card space-y-1 p-4">
          {COMPETITION_DISCLOSURES.map((d) => (
            <p key={d} className="text-[11px] text-muted-foreground">
              {d}
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
