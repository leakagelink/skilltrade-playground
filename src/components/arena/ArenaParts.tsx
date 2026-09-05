import type { ArenaBot } from "@/lib/arena/bots";
import { Button } from "@/components/ui/button";
import { money, pct } from "@/lib/format";
import { Bot, ShieldCheck } from "lucide-react";

const RISK_TONE: Record<string, string> = {
  LOW: "text-bull",
  MEDIUM: "text-primary",
  HIGH: "text-bear",
};

export function AiOpponentCard({
  bot,
  onChallenge,
  disabled,
}: {
  bot: ArenaBot;
  onChallenge: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <article className="bento-tile p-4">
      <div className="flex items-start gap-3">
        <div className="brand-gradient flex size-11 shrink-0 items-center justify-center rounded-2xl">
          <Bot className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold tracking-tight">{bot.name}</h3>
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {bot.difficulty}
            </span>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">{bot.style}</p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{bot.description}</p>

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        AI simulation profile
      </p>
      <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Risk level</dt>
          <dd className={`font-semibold ${RISK_TONE[bot.riskLevel] ?? ""}`}>{bot.riskLevel}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Position</dt>
          <dd className="font-semibold">{bot.profile.positionSize}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Stop loss</dt>
          <dd className="font-semibold">{bot.profile.stopLoss}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Take profit</dt>
          <dd className="font-semibold">{bot.profile.takeProfit}</dd>
        </div>
      </dl>

      <Button
        className="mt-4 h-11 w-full rounded-2xl text-sm font-semibold"
        disabled={disabled}
        onClick={() => onChallenge(bot.id)}
        aria-label={`Challenge ${bot.name}`}
      >
        Challenge {bot.name}
      </Button>
    </article>
  );
}

export function ArenaScoreCard({
  score,
}: {
  score: { total: number; returnScore: number; riskScore: number; drawdownScore: number; consistencyScore: number };
}) {
  const rows = [
    { label: "Return", value: score.returnScore, weight: "40%" },
    { label: "Risk management", value: score.riskScore, weight: "25%" },
    { label: "Drawdown control", value: score.drawdownScore, weight: "20%" },
    { label: "Consistency", value: score.consistencyScore, weight: "15%" },
  ];
  return (
    <div className="bento-tile p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Your Arena Score
        </p>
        <p className="num text-2xl font-bold text-primary">{score.total}</p>
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                {r.label} <span className="opacity-60">({r.weight})</span>
              </span>
              <span className="num font-semibold">{r.value}/100</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${r.value}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Arena Score is calculated on our servers from your simulated trades. It blends return with risk
        control, drawdown and consistency, so profit alone does not decide the challenge.
      </p>
    </div>
  );
}

export function ArenaResultCard({
  botName,
  winner,
  summary,
  userReturn,
  aiReturn,
}: {
  botName: string;
  winner: string | null;
  summary: string | null;
  userReturn: number | null;
  aiReturn: number | null;
}) {
  const label = winner === "USER" ? "You won" : winner === "AI" ? `${botName} won` : "Draw";
  const tone = winner === "USER" ? "text-bull" : winner === "AI" ? "text-bear" : "";
  return (
    <div className="bento-tile p-4">
      <div className="flex items-center justify-between">
        <p className={`text-base font-extrabold tracking-tight ${tone}`}>{label}</p>
        <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
      {summary ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{summary}</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground">Your return</p>
          <p className="num font-semibold">{userReturn == null ? "—" : pct(userReturn)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{botName} return</p>
          <p className="num font-semibold">{aiReturn == null ? "—" : pct(aiReturn)}</p>
        </div>
      </div>
    </div>
  );
}

export function VersusPanel({
  botName,
  botStyle,
  userEquity,
  userReturn,
  aiEquity,
  aiReturn,
  countdown,
}: {
  botName: string;
  botStyle: string;
  userEquity: number;
  userReturn: number;
  aiEquity: number;
  aiReturn: number;
  countdown: string;
}) {
  return (
    <div className="brand-gradient brand-shadow relative overflow-hidden rounded-[28px] p-5">
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary-foreground/15 blur-2xl" />
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">You</p>
          <p className="num mt-1 text-xl font-bold leading-none">{money(userEquity)}</p>
          <p className="num text-xs font-semibold opacity-90">{pct(userReturn)}</p>
        </div>
        <span className="rounded-full bg-primary-foreground/20 px-2.5 py-1 text-[10px] font-bold">VS</span>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">{botName}</p>
          <p className="num mt-1 text-xl font-bold leading-none">{money(aiEquity)}</p>
          <p className="num text-xs font-semibold opacity-90">{pct(aiReturn)}</p>
        </div>
      </div>
      <p className="relative mt-4 text-center text-[11px] font-semibold uppercase tracking-widest opacity-85">
        {botStyle} · Time remaining {countdown}
      </p>
    </div>
  );
}
