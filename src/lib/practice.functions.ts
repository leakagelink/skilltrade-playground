import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EMOTIONS = ["Calm", "Confident", "Unsure", "Impulsive", "Patient"] as const;
const txt = z.string().trim().max(1000).nullable().optional();

const DAY = 86400000;
const dayKey = (d: string | Date) => new Date(d).toISOString().slice(0, 10);

/** Consecutive UTC days with meaningful activity, ending today or yesterday. */
function computeStreak(days: Set<string>) {
  let cursor = Date.now();
  if (!days.has(dayKey(new Date(cursor)))) cursor -= DAY;
  let streak = 0;
  while (days.has(dayKey(new Date(cursor)))) {
    streak++;
    cursor -= DAY;
  }
  // Best streak
  const sorted = [...days].sort();
  let best = 0, run = 0, prev = 0;
  for (const d of sorted) {
    const t = Date.parse(d);
    run = prev && t - prev === DAY ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return { current: streak, best, activeToday: days.has(dayKey(new Date())) };
}

export const getPracticeOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: trades }, { data: challenges }, { data: journals }] = await Promise.all([
      supabase
        .from("trades")
        .select("id, symbol, direction, status, stop_loss, take_profit, realized_pnl, opened_at, closed_at")
        .eq("user_id", userId)
        .order("opened_at", { ascending: false }),
      supabase.from("user_challenges").select("completed_at, status").eq("user_id", userId).eq("status", "COMPLETED"),
      supabase.from("trade_journals").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    ]);
    const all = trades ?? [];
    const done = challenges ?? [];
    const js = journals ?? [];

    // Streak
    const days = new Set<string>();
    all.forEach((t) => {
      days.add(dayKey(t.opened_at));
      if (t.closed_at) days.add(dayKey(t.closed_at));
    });
    done.forEach((c) => c.completed_at && days.add(dayKey(c.completed_at)));
    js.forEach((j) => days.add(dayKey(j.updated_at)));
    const streak = computeStreak(days);

    // Weekly summary (last 7 days)
    const since = Date.now() - 7 * DAY;
    const opened = all.filter((t) => Date.parse(t.opened_at) >= since);
    const closed = all.filter((t) => t.status !== "OPEN" && t.closed_at && Date.parse(t.closed_at) >= since);
    const wins = closed.filter((t) => Number(t.realized_pnl ?? 0) > 0).length;
    const counts = new Map<string, number>();
    opened.forEach((t) => counts.set(t.symbol, (counts.get(t.symbol) ?? 0) + 1));
    const most = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
    const weekly = {
      opened: opened.length,
      closed: closed.length,
      winRate: pct(wins, closed.length),
      avgResult: closed.length
        ? Math.round((closed.reduce((a, t) => a + Number(t.realized_pnl ?? 0), 0) / closed.length) * 100) / 100
        : 0,
      mostTraded: most ? most[0] : null,
      slUsage: pct(opened.filter((t) => t.stop_loss != null).length, opened.length),
      tpUsage: pct(opened.filter((t) => t.take_profit != null).length, opened.length),
      challengesCompleted: done.filter((c) => c.completed_at && Date.parse(c.completed_at) >= since).length,
    };

    // Milestones (derived from stored activity)
    const allClosed = all.filter((t) => t.status !== "OPEN");
    const symbols = new Set(all.map((t) => t.symbol));
    const milestones = [
      { key: "first_trade", name: "First Steps", desc: "Opened your first simulated trade", done: all.length >= 1 },
      { key: "first_close", name: "Trade Completed", desc: "Completed your first simulated trade", done: allClosed.length >= 1 },
      { key: "first_profit", name: "Positive Practice Result", desc: "First simulated trade with a positive result", done: allClosed.some((t) => Number(t.realized_pnl ?? 0) > 0) },
      { key: "five", name: "Getting Started", desc: "5 completed simulated trades", done: allClosed.length >= 5 },
      { key: "ten", name: "Consistent Practice", desc: "10 completed simulated trades", done: allClosed.length >= 10 },
      { key: "twentyfive", name: "Dedicated Practice", desc: "25 completed simulated trades", done: allClosed.length >= 25 },
      { key: "sl", name: "Risk Aware", desc: "Used a stop loss", done: all.some((t) => t.stop_loss != null) },
      { key: "sltp", name: "Planned Exit", desc: "Used both stop loss and take profit", done: all.some((t) => t.stop_loss != null && t.take_profit != null) },
      { key: "explorer", name: "Strategy Explorer", desc: "Practised on 5 different assets", done: symbols.size >= 5 },
      { key: "challenge", name: "Challenge Complete", desc: "Completed your first challenge", done: done.length >= 1 },
      { key: "journal", name: "Reflective Practice", desc: "Wrote your first trade journal entry", done: js.length >= 1 },
      { key: "streak7", name: "Practice Streak", desc: "7-day practice streak", done: streak.best >= 7 },
    ];

    // Objective practice insights
    const insights: string[] = [];
    const recent = all.slice(0, 10);
    const earlier = all.slice(10, 30);
    const slRate = (arr: typeof all) => pct(arr.filter((t) => t.stop_loss != null).length, arr.length);
    if (recent.length >= 3) {
      const r = slRate(recent);
      if (r >= 80) insights.push("You frequently use stop losses in your recent simulated trades.");
      else if (earlier.length >= 3 && r < slRate(earlier))
        insights.push("Your recent simulated trades included fewer stop-loss settings than your earlier activity.");
      else if (r < 50) insights.push("You have not used risk controls in many of your recent simulated trades.");
    }
    if (allClosed.length >= 5) insights.push(`You have completed ${allClosed.length} simulated trades.`);
    if (most && most[1] >= 3) insights.push(`You traded ${most[0]} more frequently than other assets this week.`);
    const prevWeek = all.filter((t) => {
      const ts = Date.parse(t.opened_at);
      return ts < since && ts >= since - 7 * DAY;
    }).length;
    if (opened.length > prevWeek && prevWeek > 0) insights.push("Your recent practice activity has increased compared with the previous week.");
    if (js.length === 0 && allClosed.length > 0) insights.push("You have not written a trade journal entry yet. Reviewing completed trades can support reflection.");

    const journalIds = new Set(js.map((j) => j.trade_id));
    return {
      streak,
      weekly,
      milestones,
      insights,
      journals: js,
      reviewable: allClosed.slice(0, 20).map((t) => ({
        id: t.id,
        symbol: t.symbol,
        direction: t.direction,
        closedAt: t.closed_at,
        pnl: Number(t.realized_pnl ?? 0),
        hasJournal: journalIds.has(t.id),
      })),
    };
  });

export const saveJournal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        tradeId: z.string().uuid(),
        thesis: txt, strategy: txt, entryReason: txt, exitReason: txt,
        wentWell: txt, improve: txt, notes: txt,
        emotion: z.enum(EMOTIONS).nullable().optional(),
        confidence: z.number().int().min(1).max(5).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: trade } = await supabase.from("trades").select("id").eq("id", data.tradeId).eq("user_id", userId).maybeSingle();
    if (!trade) throw new Error("Trade not found.");
    const { error } = await supabase.from("trade_journals").upsert(
      {
        user_id: userId,
        trade_id: data.tradeId,
        thesis: data.thesis || null,
        strategy: data.strategy || null,
        entry_reason: data.entryReason || null,
        exit_reason: data.exitReason || null,
        went_well: data.wentWell || null,
        improve: data.improve || null,
        notes: data.notes || null,
        emotion: data.emotion ?? null,
        confidence: data.confidence ?? null,
      },
      { onConflict: "user_id,trade_id" },
    );
    if (error) throw new Error("Could not save your journal entry.");
    return { ok: true };
  });
