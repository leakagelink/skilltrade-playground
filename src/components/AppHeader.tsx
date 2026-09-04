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
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
      {back ? (
        <Link
          to={back}
          className="-ml-2 flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
          aria-label="Go back"
        >
          <ChevronLeft className="size-5" />
        </Link>
      ) : (
        <BrandMark size="sm" className="-ml-1 rounded-xl p-1" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
      {showSettings ? (
        <Link
          to="/settings"
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
          aria-label="Settings"
        >
          <Settings className="size-5" />
        </Link>
      ) : null}
    </header>
  );
}
