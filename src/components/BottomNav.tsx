import { Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, CandlestickChart, Sparkles, Swords, Target, Trophy, User } from "lucide-react";

const TABS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/trade", label: "Trade", icon: CandlestickChart },
  { to: "/ai-arena", label: "Arena", icon: Swords },
  { to: "/insights", label: "AI", icon: Sparkles },
  { to: "/challenges", label: "Goals", icon: Target },
  { to: "/leaderboard", label: "Ranks", icon: Trophy },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const router = useRouter();

  // Warm up every tab's code bundle once the app is idle so tab switches feel instant.
  useEffect(() => {
    let cancelled = false;
    const warm = () => {
      if (cancelled) return;
      for (const { to } of TABS) {
        void router.preloadRoute({ to }).catch(() => {});
      }
    };
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    const cic = (globalThis as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
    const handle = ric ? ric(warm, { timeout: 3000 }) : (setTimeout(warm, 1500) as unknown as number);
    return () => {
      cancelled = true;
      if (ric && cic) cic(handle);
      else clearTimeout(handle);
    };
  }, [router]);

  return (
    <nav
      aria-label="Main"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 px-2 pb-2 sm:px-4 sm:pb-3"
    >
      <ul className="glass-panel mx-auto grid w-full max-w-md grid-cols-7 items-stretch gap-0.5 rounded-[1.5rem] p-1 shadow-[0_20px_40px_-24px_oklch(0_0_0/90%)] sm:gap-1 sm:rounded-[1.75rem] sm:p-1.5">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="min-w-0">
            <Link
              to={to}
              className="group relative flex min-h-12 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[8px] leading-tight font-semibold tracking-tight text-muted-foreground transition-all duration-200 sm:min-h-14 sm:rounded-2xl sm:py-2 sm:text-[10px] sm:tracking-wide"
              activeProps={{
                className:
                  "text-primary-foreground bg-primary shadow-[0_8px_24px_-10px_oklch(0.78_0.17_158/70%)]",
              }}
            >
              <Icon
                className="size-4 shrink-0 transition-transform duration-200 group-active:scale-90 sm:size-[18px]"
                strokeWidth={2.1}
              />
              <span className="w-full truncate text-center">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
