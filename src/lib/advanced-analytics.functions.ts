import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Bucket = { key: string; trades: number; wins: number; pnl: number };
const add = (m: Map<string, Bucket>, key: string, pnl: number) => {
  const b = m.get(key) ?? { key, trades: 0, wins: 0, pnl: 0 };
  b.trades++; if (pnl > 0) b.wins++; b.pnl += pnl; m.set(key, b);
};

/** Rule-based analysis of the user's closed simulated trades. No AI calls. */
export const getAdvancedAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("trades")
      .select("symbol, asset_type, direction, position_size, stop_loss, take_profit, realized_pnl, opened_at, closed_at")
      .eq("user_id", userId).eq("status", "closed").order("closed_at", { ascending: true }).limit(1000);
    const trades = (data ?? []).filter((t) => t.closed_at);
    const bySymbol = new Map<string, Bucket>(), byType = new Map<string, Bucket>(),
      byDir = new Map<string, Bucket>(), byDay = new Map<string, Bucket>(), byWeek = new Map<string, Bucket>();
    let wins = 0, grossWin = 0, grossLoss = 0, equity = 0, peak = 0, maxDD = 0, withSL = 0, withTP = 0,
      holdMs = 0, curStreak = 0, bestWin = 0, worstLoss = 0, size = 0;
    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const curve: { t: string; v: number }[] = [];
    for (const t of trades) {
      const pnl = Number(t.realized_pnl ?? 0);
      const closed = new Date(t.closed_at!);
      if (pnl > 0) { wins++; grossWin += pnl; curStreak = curStreak >= 0 ? curStreak + 1 : 1; bestWin = Math.max(bestWin, curStreak); }
      else { grossLoss += -pnl; curStreak = curStreak <= 0 ? curStreak - 1 : -1; worstLoss = Math.max(worstLoss, -curStreak); }
      equity += pnl; peak = Math.max(peak, equity); maxDD = Math.max(maxDD, peak - equity);
      curve.push({ t: t.closed_at!, v: Math.round(equity * 100) / 100 });
      if (t.stop_loss != null) withSL++;
      if (t.take_profit != null) withTP++;
      holdMs += Math.max(0, closed.getTime() - new Date(t.opened_at).getTime());
      size += Number(t.position_size ?? 0);
      add(bySymbol, t.symbol, pnl); add(byType, t.asset_type, pnl); add(byDir, t.direction, pnl);
      add(byDay, DAYS[closed.getUTCDay()] ?? "", pnl);
      const wk = new Date(closed); wk.setUTCDate(wk.getUTCDate() - ((wk.getUTCDay() + 6) % 7));
      add(byWeek, wk.toISOString().slice(0, 10), pnl);
    }
    const n = trades.length;
    const symbols = [...bySymbol.values()].sort((a, b) => b.pnl - a.pnl);
    return {
      total: n,
      winRate: n ? (wins / n) * 100 : 0,
      netPnl: equity,
      avgWin: wins ? grossWin / wins : 0,
      avgLoss: n - wins ? grossLoss / (n - wins) : 0,
      profitFactor: grossLoss ? grossWin / grossLoss : grossWin > 0 ? null : 0,
      maxDrawdown: maxDD,
      stopLossPct: n ? (withSL / n) * 100 : 0,
      takeProfitPct: n ? (withTP / n) * 100 : 0,
      avgHoldHours: n ? holdMs / n / 3_600_000 : 0,
      avgSize: n ? size / n : 0,
      longestWinStreak: bestWin,
      longestLossStreak: worstLoss,
      curve: curve.slice(-200),
      best: symbols.slice(0, 3),
      worst: symbols.filter((s) => s.pnl < 0).slice(-3).reverse(),
      byType: [...byType.values()],
      byDirection: [...byDir.values()],
      byDay: DAYS.map((d) => byDay.get(d) ?? { key: d, trades: 0, wins: 0, pnl: 0 }),
      weekly: [...byWeek.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-8),
    };
  });
