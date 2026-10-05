import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { GraduationCap, X } from "lucide-react";
import { usePersonalization, type LearningMode } from "@/lib/personalization";

export type TipScreen = "home" | "markets" | "chart" | "insights";

/** Rule-based, mode-aware guidance. No AI calls. */
const TIPS: Record<TipScreen, Record<LearningMode, { title: string; body: string } | null>> = {
  home: {
    beginner: {
      title: "Start small",
      body: "Balance is virtual money. Try one small trade, set a stop loss, and watch how profit/loss changes.",
    },
    intermediate: {
      title: "Practice a plan",
      body: "Before each trade, decide entry, stop loss and target. Review win rate and risk/reward weekly in Practice Center.",
    },
    expert: null,
  },
  markets: {
    beginner: {
      title: "How to read this list",
      body: "Green % means price rose today, red means it fell. Tap any asset to see its chart and place a simulated trade.",
    },
    intermediate: {
      title: "Compare before choosing",
      body: "Look at daily change and volatility. Higher-moving assets need wider stops and smaller position sizes.",
    },
    expert: null,
  },
  chart: {
    beginner: {
      title: "Trading basics",
      body: "BUY profits if price goes up, SELL profits if it goes down. A stop loss closes the trade automatically to limit loss; take profit locks gains.",
    },
    intermediate: {
      title: "Risk check",
      body: "Aim to risk only 1–2% of balance per trade, and keep reward at least 1.5× the risk between entry and stop.",
    },
    expert: null,
  },
  insights: {
    beginner: {
      title: "What these insights mean",
      body: "These notes look at your simulated trades and point out simple habits to improve. They are learning tips, not advice.",
    },
    intermediate: {
      title: "Use the patterns",
      body: "Focus on one repeat mistake at a time, like holding losers too long, and track it in your Trade Journal.",
    },
    expert: null,
  },
};

export function ModeTip({ screen }: { screen: TipScreen }) {
  const { data } = usePersonalization();
  const [hidden, setHidden] = useState(false);
  const mode: LearningMode = data?.active_learning_mode ?? "beginner";
  const tip = TIPS[screen][mode];
  if (!tip || hidden) return null;
  return (
    <div className="surface-card flex gap-3 p-3">
      <GraduationCap className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {tip.title}{" "}
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            · {mode} mode
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{tip.body}</p>
        <Link to="/settings" className="mt-1 inline-block text-[11px] font-medium text-primary">
          Change learning mode
        </Link>
      </div>
      <button aria-label="Hide tip" onClick={() => setHidden(true)} className="self-start text-muted-foreground">
        <X className="size-4" />
      </button>
    </div>
  );
}
