import { Link } from "@tanstack/react-router";
import { ChevronLeft, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandLogo";

export function AppHeader({
  title,
  subtitle,
  back,
  action,
  showSettings,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  action?: ReactNode;
  showSettings?: boolean;
}) {
  return (
    <header className="glass-panel sticky top-0 z-30 flex items-center gap-3 border-x-0 border-t-0 px-4 py-3">
      {back ? (
        <Link
          to={back}
          className="-ml-1 flex size-9 items-center justify-center rounded-2xl border border-border/70 bg-elevated/60 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Go back"
        >
          <ChevronLeft className="size-5" />
        </Link>
      ) : (
        <BrandMark size="sm" className="-ml-1 rounded-2xl p-1" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[17px] font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
      {showSettings ? (
        <Link
          to="/settings"
          className="flex size-9 items-center justify-center rounded-2xl border border-border/70 bg-elevated/60 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="size-4.5" />
        </Link>
      ) : null}
    </header>
  );
}
