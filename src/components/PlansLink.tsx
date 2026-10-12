import { Link } from "@tanstack/react-router";
import { ChevronRight, Crown } from "lucide-react";

/** Non-intrusive entry point to the Plans & subscription screen. Purchases happen only via Google Play. */
export function PlansLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/subscription" className="bento-tile flex items-center gap-3 p-4" aria-label="Open Plans and subscription">
      <div className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-primary">
        <Crown className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Plans &amp; subscription</p>
        <p className="truncate text-xs text-muted-foreground">
          {compact ? "Go ad-free with Pro or Elite" : "Basic, Pro & Elite · Pro/Elite ad-free · Cancel anytime in Google Play"}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
