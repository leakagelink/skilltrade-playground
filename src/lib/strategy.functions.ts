import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const txt = z.string().trim().max(1000).nullable().optional();

export const STRATEGY_MARKETS = ["any", "us", "india", "commodities", "crypto"] as const;
export const STRATEGY_TIMEFRAMES = ["15m", "1H", "4H", "1D", "1W"] as const;

const strategyInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(60),
  market: z.enum(STRATEGY_MARKETS),
  timeframe: z.enum(STRATEGY_TIMEFRAMES),
  entryConditions: txt,
  exitConditions: txt,
  stopLossRule: txt,
  takeProfitRule: txt,
  riskRule: txt,
  positionSizingRule: txt,
  notes: txt,
  requiresStopLoss: z.boolean(),
  requiresTakeProfit: z.boolean(),
  maxPositionPct: z.number().positive().max(100).nullable().optional(),
});

/** Strategies plus objective results from simulated trades whose journal names the strategy. */
export const getStrategyLab = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: strategies }, { data: journals }, { data: trades }] = await Promise.all([
      supabase.from("strategies").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
      supabase.from("trade_journals").select("trade_id, strategy").eq("user_id", userId).not("strategy", "is", null),
      supabase
        .from("trades")
        .select("id, symbol, status, position_size, stop_loss, take_profit, realized_pnl, opened_at, closed_at")
        .eq("user_id", userId),
    ]);
    const byId = new Map((trades ?? []).map((t) => [t.id, t]));
    const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

    const results = (strategies ?? []).map((s) => {
      const key = s.name.trim().toLowerCase();
      const linked = (journals ?? [])
        .filter((j) => (j.strategy ?? "").trim().toLowerCase() === key)
        .map((j) => byId.get(j.trade_id))
        .filter((t): t is NonNullable<typeof t> => !!t);
      const closed = linked.filter((t) => t.status !== "OPEN");
      const pnls = closed.map((t) => Number(t.realized_pnl ?? 0));
      const wins = pnls.filter((p) => p > 0);
      const losses = pnls.filter((p) => p < 0);
      const grossWin = wins.reduce((a, b) => a + b, 0);
      const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
      const followed = linked.filter(
        (t) =>
          (!s.requires_stop_loss || t.stop_loss != null) &&
          (!s.requires_take_profit || t.take_profit != null),
      ).length;
      return {
        strategyId: s.id,
        trades: linked.length,
        closed: closed.length,
        winRate: pct(wins.length, closed.length),
        netPnl: Math.round(pnls.reduce((a, b) => a + b, 0) * 100) / 100,
        avgPnl: closed.length ? Math.round((pnls.reduce((a, b) => a + b, 0) / closed.length) * 100) / 100 : 0,
        best: pnls.length ? Math.max(...pnls) : 0,
        worst: pnls.length ? Math.min(...pnls) : 0,
        profitFactor: grossLoss > 0 && wins.length ? Math.round((grossWin / grossLoss) * 100) / 100 : null,
        ruleAdherence: pct(followed, linked.length),
      };
    });
    return { strategies: strategies ?? [], results };
  });

export const saveStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => strategyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const row = {
      user_id: userId,
      name: data.name,
      market: data.market,
      timeframe: data.timeframe,
      entry_conditions: data.entryConditions || null,
      exit_conditions: data.exitConditions || null,
      stop_loss_rule: data.stopLossRule || null,
      take_profit_rule: data.takeProfitRule || null,
      risk_rule: data.riskRule || null,
      position_sizing_rule: data.positionSizingRule || null,
      notes: data.notes || null,
      requires_stop_loss: data.requiresStopLoss,
      requires_take_profit: data.requiresTakeProfit,
      max_position_pct: data.maxPositionPct ?? null,
    };
    const q = data.id
      ? supabase.from("strategies").update(row).eq("id", data.id).eq("user_id", userId)
      : supabase.from("strategies").insert(row);
    const { error } = await q;
    if (error) {
      if (error.code === "23505") throw new Error("You already have a strategy with this name.");
      throw new Error("Could not save the strategy.");
    }
    return { ok: true, created: !data.id };
  });

export const deleteStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("strategies").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error("Could not delete the strategy.");
    return { ok: true };
  });
