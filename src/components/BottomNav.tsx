import { Link } from "@tanstack/react-router";
import { Home, CandlestickChart, Target, Trophy, User } from "lucide-react";

const TABS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/trade", label: "Trade", icon: CandlestickChart },
  { to: "/challenges", label: "Goals", icon: Target },
  { to: "/leaderboard", label: "Ranks", icon: Trophy },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 px-4 pb-3">
      <ul className="glass-panel mx-auto flex max-w-md items-stretch justify-between gap-1 rounded-[1.75rem] p-1.5 shadow-[0_20px_40px_-24px_oklch(0_0_0/90%)]">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="group relative flex min-h-13 flex-col items-center justify-center gap-1 rounded-3xl px-1 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground transition-all duration-200"
              activeProps={{
                className:
                  "text-primary-foreground bg-primary shadow-[0_8px_24px_-10px_oklch(0.78_0.17_158/70%)]",
              }}
            >
              <Icon className="size-5 transition-transform duration-200 group-active:scale-90" strokeWidth={2.1} />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
