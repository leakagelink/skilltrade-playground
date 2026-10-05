import { Link } from "@tanstack/react-router";
import { Compass, ChevronRight } from "lucide-react";
import { usePersonalization, type LearningGoal, type LearningMode } from "@/lib/personalization";

const TITLES: Record<LearningMode, string> = {
  beginner: "Your Beginner Practice Path",
  intermediate: "Your Strategy Practice Path",
  expert: "Your Advanced Practice Path",
};

const STEPS: Record<LearningMode, { text: string; to: "/trade" | "/challenges" | "/practice" | "/insights" | "/ai-arena" | "/career" }[]> = {
  beginner: [
    { text: "Open a small simulated trade and set a Stop Loss — it limits how much a trade can lose.", to: "/trade" },
    { text: "Write a short journal note: why did you enter?", to: "/practice" },
    { text: "Try a beginner challenge to earn XP.", to: "/challenges" },
  ],
  intermediate: [
    { text: "Use both Stop Loss and Take Profit on your next trades and compare results.", to: "/trade" },
    { text: "Review your weekly summary and improvement areas.", to: "/practice" },
    { text: "Check your Trader DNA and risk metrics.", to: "/insights" },
  ],
  expert: [
    { text: "Analyze win rate, drawdown and risk discipline in Insights.", to: "/insights" },
    { text: "Test your strategy against an AI bot in the Arena.", to: "/ai-arena" },
    { text: "Advance your Career Mode stage.", to: "/career" },
  ],
};

const GOAL_TIPS: Record<LearningGoal, string> = {
  basics: "Focus: understanding orders, Stop Loss and Take Profit.",
  strategies: "Focus: repeat one simulated strategy and journal the outcome.",
  risk: "Focus: keep each position small and always set a Stop Loss.",
  test_strategy: "Focus: apply your rules the same way every trade and track results.",
  consistency: "Focus: practice a little every day to grow your streak.",
};

export function PracticeJourneyCard() {
  const { data, isLoading } = usePersonalization();
  if (isLoading) return null;

  if (!data?.personalization_completed) {
    return (
      <Link to="/onboarding" search={{ personalize: true }} className="bento-tile flex items-center gap-3 p-3">
        <Compass className="size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Personalize your practice</p>
          <p className="text-[11px] text-muted-foreground">Answer a few quick questions to get a practice path.</p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    );
  }

  const mode = data.active_learning_mode;
  const steps = mode === "beginner" ? STEPS.beginner : STEPS[mode];
  return (
    <div className="bento-tile space-y-2 p-3">
      <div className="flex items-center gap-2">
        <Compass className="size-4 text-primary" />
        <p className="text-sm font-semibold">{TITLES[mode]}</p>
      </div>
      {data.learning_goal ? <p className="text-[11px] text-muted-foreground">{GOAL_TIPS[data.learning_goal]}</p> : null}
      <ol className="space-y-1">
        {steps.map((s, i) => (
          <li key={i}>
            <Link to={s.to} className="flex items-start gap-2 rounded-lg p-1.5 text-xs hover:bg-secondary/50">
              <span className="num mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">{i + 1}</span>
              <span className="flex-1">{s.text}</span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="text-[10px] text-muted-foreground">Educational practice suggestions for simulated trading only. Not investment advice.</p>
    </div>
  );
}
