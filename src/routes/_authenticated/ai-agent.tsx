import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bot, Flag, Lock, Send } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RewardedAdOffer } from "@/components/ads/RewardedAdOffer";
import { askAgent, getAgentStatus, reportAgentAnswer } from "@/lib/ai-agent.functions";

export const Route = createFileRoute("/_authenticated/ai-agent")({
  head: () => ({
    meta: [
      { title: "AI Trading Coach Agent — TradeVirt" },
      { name: "description", content: "Ask TradeVirt's educational AI coach about trading concepts, risk and your simulated trades." },
      { property: "og:title", content: "AI Coach Agent — TradeVirt" },
      { property: "og:description", content: "Educational AI chat for paper traders. Not financial advice." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function AgentPage() {
  const qc = useQueryClient();
  const loadStatus = useServerFn(getAgentStatus);
  const ask = useServerFn(askAgent);
  const report = useServerFn(reportAgentAnswer);
  const status = useQuery({ queryKey: ["agent-status"], queryFn: () => loadStatus(), staleTime: 15_000 });
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const s = status.data;
  const canAsk = !!s && (s.unlocked || s.freeAvailable);

  const send = useMutation({
    mutationFn: async (question: string) => ask({ data: { question, history: messages } }),
    onSuccess: (res, question) => {
      setMessages((m) => [...m, { role: "user", content: question }, { role: "assistant", content: res.answer }]);
      setInput("");
      void qc.invalidateQueries({ queryKey: ["agent-status"] });
    },
    onError: (e: Error) => {
      if (e.message === "LOCKED") {
        toast.message("Free question used. Watch an optional ad to unlock the AI Agent.");
        void qc.invalidateQueries({ queryKey: ["agent-status"] });
      } else toast.error(e.message);
    },
  });

  const submit = () => {
    const q = input.trim();
    if (q.length < 2 || send.isPending) return;
    send.mutate(q);
  };

  const flag = async (i: number) => {
    try {
      await report({ data: { question: messages[i - 1]?.content ?? "", answer: messages[i]!.content } });
      toast.success("Thanks — this answer was reported for review.");
    } catch {
      toast.error("Could not send report. Please try again.");
    }
  };

  const untilText = s?.unlockedUntil
    ? new Date(s.unlockedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 px-3 pb-6 sm:px-4">
      <AppHeader title="AI Coach Agent" subtitle="Ask anything about trading — educational only" back="/insights" />

      <section className="bento-tile space-y-1 p-3 text-xs">
        {s?.unlocked ? (
          <p className="font-semibold text-primary">Unlocked until {untilText}</p>
        ) : s?.freeAvailable ? (
          <p className="font-semibold">You have 1 free question today.</p>
        ) : (
          <p className="flex items-center gap-1.5 font-semibold"><Lock className="size-3.5" /> Free question used for today.</p>
        )}
        <p className="text-muted-foreground">Optional ads: 1 ad = 5 hours · 2 ads = 10 hours · 3 ads = 24 hours (max 3 per day).</p>
      </section>

      {s && !s.unlocked && s.unlockAds < 3 && (
        <RewardedAdOffer
          placement="AI_AGENT"
          title={s.unlockAds === 0 ? "Unlock AI Agent for 5 hours" : s.unlockAds === 1 ? "Extend to 10 hours" : "Extend to 24 hours"}
          onGranted={() => void qc.invalidateQueries({ queryKey: ["agent-status"] })}
        />
      )}
      {s?.unlocked && s.unlockAds < 3 && (
        <RewardedAdOffer
          placement="AI_AGENT"
          title={s.unlockAds === 1 ? "Extend AI Agent to 10 hours" : "Extend AI Agent to 24 hours"}
          onGranted={() => void qc.invalidateQueries({ queryKey: ["agent-status"] })}
        />
      )}

      <section className="space-y-2.5">
        {messages.length === 0 && (
          <div className="bento-tile flex items-start gap-2 p-3 text-sm text-muted-foreground">
            <Bot className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>Hi! Ask me about stop-loss, risk management, candlesticks, or how to improve your simulated trading.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "bento-tile max-w-[90%] whitespace-pre-wrap break-words p-3 text-sm"
              }
            >
              {m.content}
              {m.role === "assistant" && (
                <button
                  type="button"
                  onClick={() => void flag(i)}
                  className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  <Flag className="size-3" /> Report answer
                </button>
              )}
            </div>
          </div>
        ))}
        {send.isPending && <p className="text-xs text-muted-foreground">Coach is thinking…</p>}
        <div ref={endRef} />
      </section>

      <div className="bento-tile space-y-2 p-2.5">
        <Textarea
          value={input}
          maxLength={500}
          rows={2}
          disabled={!canAsk || send.isPending}
          placeholder={canAsk ? "Type your question…" : "Unlock with an optional ad to ask more"}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="resize-none text-sm"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">{input.length}/500</span>
          <Button size="sm" onClick={submit} disabled={!canAsk || send.isPending || input.trim().length < 2}>
            <Send className="size-4" /> Ask
          </Button>
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-muted-foreground">
        AI answers are generated automatically, may be wrong, and are for education only — not financial, investment or trading advice. TradeVirt is a simulator with virtual money. Ads are optional; unlocks have no cash value.
      </p>
    </div>
  );
}
