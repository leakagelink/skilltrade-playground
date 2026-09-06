import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Version 1.1 AI Insights server functions.
 *
 * Every score is derived from verified database rows. The frontend can never
 * supply user identity, trade ownership or score values — identity always comes
 * from the authenticated session and trade ownership is re-verified server-side.
 */

export class AiError extends Error {}

/** Free for all users in v1.1; a configurable ceiling to keep costs predictable. */
export const AI_ANALYSIS_DAILY_LIMIT = 15;

async function deps() {
  const [{ supabaseAdmin }, dna, engine] = await Promise.all([
    import("@/integrations/supabase/client.server"),
    import("./ai/dna.server"),
    import("./engine.server"),
  ]);
  return { admin: supabaseAdmin, ...dna, ...engine };
}

type TradeRow = Record<string, unknown>;

function toDnaTrade(t: TradeRow) {
  return {
    direction: t["direction"] as "BUY" | "SELL",
    entry_price: Number(t["entry_price"]),
    exit_price: t["exit_price"] == null ? null : Number(t["exit_price"]),
    position_size: Number(t["position_size"]),
    stop_loss: t["stop_loss"] == null ? null : Number(t["stop_loss"]),
    take_profit: t["take_profit"] == null ? null : Number(t["take_profit"]),
    realized_pnl: t["realized_pnl"] == null ? null : Number(t["realized_pnl"]),
    status: String(t["status"]),
    opened_at: String(t["opened_at"]),
    closed_at: (t["closed_at"] as string | null) ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* AI Insights screen data                                             */
/* ------------------------------------------------------------------ */

export const getAiInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { admin, calculateTraderDna, comparePerformance, grantBadge } = await deps();

    const [{ data: trades }, { data: reviews }, { data: profile }] = await Promise.all([
      admin.from("trades").select("*").eq("user_id", userId).order("opened_at", { ascending: false }),
      admin
        .from("ai_trade_reviews")
        .select("*, trades(symbol, direction, realized_pnl, closed_at)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      admin.from("profiles").select("username, level").eq("id", userId).maybeSingle(),
    ]);

    const rows = (trades ?? []).map(toDnaTrade);
    const dna = calculateTraderDna(rows);
    const comparison = comparePerformance(rows);

    if (dna.hasEnoughData) {
      await admin.from("trader_dna_profiles").upsert(
        {
          user_id: userId,
          risk_control_score: dna.riskControl,
          discipline_score: dna.discipline,
          consistency_score: dna.consistency,
          patience_score: dna.patience,
          position_size_management_score: dna.positionSizeManagement,
          activity_level: dna.activityLevel,
          personality: dna.personality,
          calculated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      await grantBadge(admin, userId, "trader_dna_unlocked");
      if (dna.consistency >= 70) await grantBadge(admin, userId, "consistency_explorer");
    }

    const since = new Date(Date.now() - 86_400_000).toISOString();
    const usedToday = (reviews ?? []).filter((r) => String(r["created_at"]) > since).length;

    const { data: adActivity } = await admin
      .from("user_ad_activity")
      .select("bonus_ai_analyses")
      .eq("user_id", userId)
      .eq("activity_date", new Date().toISOString().slice(0, 10))
      .maybeSingle();

    return {
      username: (profile?.username as string) ?? "Trader",
      dna,
      comparison,
      dailyLimit: AI_ANALYSIS_DAILY_LIMIT + Number(adActivity?.["bonus_ai_analyses"] ?? 0),
      usedToday,
      reviews: (reviews ?? []).map((r) => {
        const trade = (r as Record<string, unknown>)["trades"] as Record<string, unknown> | null;
        return {
          id: String(r["id"]),
          tradeId: String(r["trade_id"]),
          createdAt: String(r["created_at"]),
          symbol: (trade?.["symbol"] as string) ?? "—",
          direction: (trade?.["direction"] as string) ?? "",
          realizedPnl: trade?.["realized_pnl"] == null ? 0 : Number(trade["realized_pnl"]),
          riskManagementScore: Number(r["risk_management_score"]),
          disciplineScore: Number(r["discipline_score"]),
          timingScore: Number(r["timing_score"]),
          consistencyScore: Number(r["consistency_score"]),
          summary: String(r["summary"]),
          strengths: (r["strengths"] as string[]) ?? [],
          areasToReview: (r["areas_to_review"] as string[]) ?? [],
          detectedPatterns: (r["detected_patterns"] as string[]) ?? [],
          educationalNote: String(r["educational_note"] ?? ""),
        };
      }),
    };
  });

/* ------------------------------------------------------------------ */
/* AI Trade Coach — review one completed simulated trade               */
/* ------------------------------------------------------------------ */

export const requestTradeReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tradeId: string }) => {
    if (!data?.tradeId) throw new AiError("Missing trade.");
    return { tradeId: String(data.tradeId) };
  })
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { admin, grantBadge } = await deps();
    const { generateTradeReview, AiUnavailableError, AI_DISCLAIMER } = await import("./ai/coach.server");

    // Ownership is verified against the database, never taken from the client.
    const { data: trade } = await admin
      .from("trades")
      .select("*")
      .eq("id", data.tradeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!trade) throw new AiError("Trade not found.");
    if (trade["status"] === "OPEN") throw new AiError("Only closed simulated trades can be reviewed.");

    const { data: existing } = await admin
      .from("ai_trade_reviews")
      .select("*")
      .eq("trade_id", data.tradeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return { review: existing, disclaimer: AI_DISCLAIMER, cached: true };

    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await admin
      .from("ai_trade_reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gt("created_at", since);
    // Optional ad-earned bonus analyses raise today's limit (virtual only).
    const { data: adActivity } = await admin
      .from("user_ad_activity")
      .select("bonus_ai_analyses")
      .eq("user_id", userId)
      .eq("activity_date", new Date().toISOString().slice(0, 10))
      .maybeSingle();
    const bonusToday = Number(adActivity?.["bonus_ai_analyses"] ?? 0);
    if ((count ?? 0) >= AI_ANALYSIS_DAILY_LIMIT + bonusToday) {
      throw new AiError("Your AI analysis limit has been reached for today. Please try again later.");
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("virtual_balance")
      .eq("id", userId)
      .maybeSingle();
    const balance = Math.max(Number(profile?.["virtual_balance"] ?? 100000), 1);

    const { data: history } = await admin
      .from("trades")
      .select("realized_pnl, stop_loss, status")
      .eq("user_id", userId)
      .neq("status", "OPEN");
    const closed = history ?? [];
    const wins = closed.filter((t) => Number(t["realized_pnl"] ?? 0) > 0).length;

    const entry = Number(trade["entry_price"]);
    const exit = Number(trade["exit_price"] ?? entry);
    const size = Number(trade["position_size"]);
    const sl = trade["stop_loss"] == null ? null : Number(trade["stop_loss"]);
    const tp = trade["take_profit"] == null ? null : Number(trade["take_profit"]);
    const openedAt = new Date(String(trade["opened_at"])).getTime();
    const closedAt = new Date(String(trade["closed_at"] ?? trade["opened_at"])).getTime();

    const round2 = (n: number) => Math.round(n * 100) / 100;

    let generated;
    try {
      generated = await generateTradeReview({
        assetCategory: String(trade["asset_type"] ?? "UNKNOWN"),
        direction: trade["direction"] as "BUY" | "SELL",
        entryPrice: entry,
        exitPrice: exit,
        positionSizePctOfBalance: round2((size / balance) * 100),
        riskPctOfBalance:
          sl == null ? null : round2(((Math.abs(entry - sl) / entry) * size) / balance * 100),
        plannedRiskReward:
          sl == null || tp == null || Math.abs(entry - sl) === 0
            ? null
            : round2(Math.abs(tp - entry) / Math.abs(entry - sl)),
        hadStopLoss: sl != null,
        hadTakeProfit: tp != null,
        resultPctOfPosition: round2((Number(trade["realized_pnl"] ?? 0) / Math.max(size, 1)) * 100),
        holdMinutes: Math.round(Math.max(0, closedAt - openedAt) / 60000),
        closeReason: String(trade["status"]),
        historicalTrades: closed.length,
        historicalWinRate: closed.length ? Math.round((wins / closed.length) * 1000) / 10 : 0,
        historicalStopLossUsagePct: closed.length
          ? Math.round((closed.filter((t) => t["stop_loss"] != null).length / closed.length) * 100)
          : 0,
      });
    } catch (err) {
      if (err instanceof AiUnavailableError) throw new AiError(err.message);
      throw new AiError("AI analysis is temporarily unavailable. Please try again later.");
    }

    const { data: saved } = await admin
      .from("ai_trade_reviews")
      .insert({
        user_id: userId,
        trade_id: data.tradeId,
        risk_management_score: generated.risk_management_score,
        discipline_score: generated.discipline_score,
        timing_score: generated.timing_score,
        consistency_score: generated.consistency_score,
        summary: generated.summary,
        strengths: generated.strengths,
        areas_to_review: generated.areas_to_review,
        detected_patterns: generated.detected_patterns,
        educational_note: generated.educational_note,
      })
      .select("*")
      .single();

    await grantBadge(admin, userId, "ai_explorer");

    return { review: saved, disclaimer: AI_DISCLAIMER, cached: false };
  });
