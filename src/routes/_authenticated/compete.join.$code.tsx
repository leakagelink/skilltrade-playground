import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { joinByInviteCode } from "@/lib/compete.functions";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/_authenticated/compete/join/$code")({
  head: () => ({
    meta: [
      { title: "Join challenge — TradeVirt" },
      { name: "description", content: "Accept a friend's simulated trading challenge on TradeVirt. Virtual funds only." },
      { property: "og:title", content: "Join challenge — TradeVirt" },
      { property: "og:description", content: "A simulated trading challenge with virtual funds. No real money." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { code } = Route.useParams();
  const join = useServerFn(joinByInviteCode);
  const navigate = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    join({ data: { code } })
      .then((res) => {
        toast.success("You are in. Good luck!");
        void navigate({ to: "/compete/$id", params: { id: res.competitionId } });
      })
      .catch((e: Error) => {
        toast.error(e.message || "That invitation is not valid.");
        void navigate({ to: "/compete" });
      });
  }, [code, join, navigate]);

  return (
    <main>
      <AppHeader title="Joining challenge" subtitle="Simulated trading only" />
      <div className="flex flex-col items-center gap-3 p-10 text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" />
        Checking your invitation…
      </div>
    </main>
  );
}
