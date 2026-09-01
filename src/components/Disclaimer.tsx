import { Info } from "lucide-react";

export function SimulationBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ${className}`}
    >
      Simulation only
    </span>
  );
}

export function DisclaimerNote({ text }: { text?: string }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-secondary/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span>
        {text ??
          "This application provides simulated paper trading only. No real money trading is available. Virtual balance and credits have no monetary value."}
      </span>
    </p>
  );
}
