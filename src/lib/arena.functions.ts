import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ARENA_DURATION_DAYS,
  ARENA_STARTING_CAPITAL,
  ARENA_UNIVERSE,
  arenaBot,
} from "./arena/bots";

/**
 * Version 1.2 AI Arena server functions.
 *
 * Identity always comes from the authenticated session. Scores, AI trades,
 * timers and the winner are computed server-side only — the client can never
 * supply or change them.
 */
export class ArenaError extends Error {}

function fail(message: string): never {
  throw new ArenaError(message);
}

async function deps() {
  const [{ supabaseAdmin }, engine] = await Promise.all([
    import("@/integrations/supabase/client.server"),
    import("./arena/engine.server"),
  ]);
  return { admin: supabaseAdmin, ...engine };
}

/* ------------------------------------------------------------------ */
/* Arena state                                                         */
/* ------------------------------------------------------------------ */

export const getArenaState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { admin, runBotCatchUp, markToMarket, computeArenaScore, finalizeSession } = await deps();

    let { data: session } = await admin
      .from("ai_arena_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .order("start_time", { ascending: false })
      .maybeSingle();

    if (session) {
      const bot = arenaBot(String(session.bot_id));
      if (bot) {
        await runBotCatchUp(admin, session as Record<string, unknown>, bot);
        const { data: refreshed } = await admin
          .from("ai_arena_sessions")
          .select("*")
          .eq("id", session.id)
          .single();
        session = refreshed ?? session;

        // Server time decides completion — never the client clock.
        if (new Date(String(session.end_time)).getTime() <= Date.now()) {
          await finalizeSession(admin, session as Record<string, unknown>);
          session = null;
        }
      }
    }

    if (!session) {
      const { data: history } = await admin
        .from("ai_arena_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("start_time", { ascending: false })
        .limit(10);
      return { active: null, history: (history ?? []).map(serializeSession) };
    }

    const startingBalance = Number(session.starting_balance);
    const [user, ai] = await Promise.all([
      markToMarket(admin, String(session.id), "USER", startingBalance, Number(session.user_cash)),
      markToMarket(admin, String(session.id), "AI", startingBalance, Number(session.ai_cash)),
    ]);

    const userScore = computeArenaScore([...user.closedTrades, ...user.openTrades], startingBalance, user.equity);
    const aiScore = computeArenaScore([...ai.closedTrades, ...ai.openTrades], startingBalance, ai.equity);

    const { data: history } = await admin
      .from("ai_arena_sessions")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "ACTIVE")
      .order("start_time", { ascending: false })
      .limit(10);

    return {
      active: {
        id: String(session.id),
        botId: String(session.bot_id),
        startingBalance,
        startTime: String(session.start_time),
        endTime: String(session.end_time),
        serverNow: new Date().toISOString(),
        marketDataOk: user.marketDataOk && ai.marketDataOk,
        user: {
          cash: user.cash,
          equity: user.equity,
          openPnl: user.openPnl,
          realizedPnl: user.realizedPnl,
          returnPct: user.returnPct,
          score: userScore,
          openTrades: user.openTrades,
          closedTrades: user.closedTrades.slice(0, 20),
        },
        ai: {
          equity: ai.equity,
          openPnl: ai.openPnl,
          returnPct: ai.returnPct,
          score: aiScore.total,
          openCount: ai.openTrades.length,
          closedCount: ai.closedTrades.length,
          recentTrades: [...ai.openTrades, ...ai.closedTrades].slice(0, 8),
        },
      },
      history: (history ?? []).map(serializeSession),
    };
  });

function serializeSession(s: Record<string, unknown>) {
  return {
    id: String(s["id"]),
    botId: String(s["bot_id"]),
    status: String(s["status"]),
    startTime: String(s["start_time"]),
    endTime: String(s["end_time"]),
    userScore: s["user_score"] == null ? null : Number(s["user_score"]),
    aiScore: s["ai_score"] == null ? null : Number(s["ai_score"]),
    userReturn: s["user_return"] == null ? null : Number(s["user_return"]),
    aiReturn: s["ai_return"] == null ? null : Number(s["ai_return"]),
    winner: (s["winner"] as string | null) ?? null,
    summary: (s["result_summary"] as string | null) ?? null,
  };
}

export const getArenaHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin } = await deps();
    const { data } = await admin
      .from("ai_arena_sessions")
      .select("*")
      .eq("user_id", context.userId)
      .order("start_time", { ascending: false })
      .limit(50);
    return { sessions: (data ?? []).map(serializeSession) };
  });

/* ------------------------------------------------------------------ */
/* Start an arena                                                      */
/* ------------------------------------------------------------------ */

export const startArena = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { botId: string }) => {
    if (!data?.botId || !arenaBot(String(data.botId))) fail("Please choose an AI Arena opponent.");
    return { botId: String(data.botId) };
  })
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { admin } = await deps();

    const { data: existing } = await admin
      .from("ai_arena_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (existing) fail("You already have an active AI Arena challenge.");

    const now = new Date();
    const end = new Date(now.getTime() + ARENA_DURATION_DAYS * 86_400_000);

    const { data: session, error } = await admin
      .from("ai_arena_sessions")
      .insert({
        user_id: userId,
        bot_id: data.botId,
        status: "ACTIVE",
        starting_balance: ARENA_STARTING_CAPITAL,
        user_cash: ARENA_STARTING_CAPITAL,
        ai_cash: ARENA_STARTING_CAPITAL,
        start_time: now.toISOString(),
        end_time: end.toISOString(),
        last_bot_tick_at: now.toISOString(),
      })
      .select("id")
      .single();
    if (error || !session) fail("Could not create the Arena challenge. Please try again.");

    return { sessionId: String(session.id) };
  });

/* ------------------------------------------------------------------ */
/* Arena trading (user side)                                           */
/* ------------------------------------------------------------------ */

export const openArenaTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    symbol: string;
    direction: "BUY" | "SELL";
    positionSize: number;
    stopLoss?: number | null;
    takeProfit?: number | null;
  }) => {
    const symbol = String(data?.symbol ?? "").toUpperCase();
    if (!ARENA_UNIVERSE.includes(symbol)) fail("This asset is not available in the AI Arena.");
    if (data.direction !== "BUY" && data.direction !== "SELL") fail("Invalid trade direction.");
    const size = Number(data.positionSize);
    if (!Number.isFinite(size) || size <= 0) fail("Enter a valid position size.");
    return {
      symbol,
      direction: data.direction,
      positionSize: Math.round(size * 100) / 100,
      stopLoss: data.stopLoss ? Number(data.stopLoss) : null,
      takeProfit: data.takeProfit ? Number(data.takeProfit) : null,
    };
  })
  .handler(async ({ data, context }) => {
    const { admin } = await deps();
    const { data: session } = await admin
      .from("ai_arena_sessions")
      .select("*")
      .eq("user_id", context.userId)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (!session) fail("You do not have an active AI Arena challenge.");
    if (new Date(String(session.end_time)).getTime() <= Date.now()) fail("This Arena challenge has ended.");

    const { getMarketDataProvider } = await import("./market/provider.server");
    let entry: number;
    try {
      entry = (await getMarketDataProvider().getLatestPrice(data.symbol)).price;
    } catch {
      fail("Market data is temporarily unavailable. Please try again later.");
    }
    if (!Number.isFinite(entry) || entry <= 0) fail("Market data is temporarily unavailable. Please try again later.");

    if (data.stopLoss != null) {
      if (data.direction === "BUY" && data.stopLoss >= entry) fail("Stop loss must be below the entry price for a BUY.");
      if (data.direction === "SELL" && data.stopLoss <= entry) fail("Stop loss must be above the entry price for a SELL.");
    }
    if (data.takeProfit != null) {
      if (data.direction === "BUY" && data.takeProfit <= entry) fail("Take profit must be above the entry price for a BUY.");
      if (data.direction === "SELL" && data.takeProfit >= entry) fail("Take profit must be below the entry price for a SELL.");
    }

    const { data: openRows } = await admin
      .from("arena_trades")
      .select("position_size")
      .eq("arena_session_id", session.id)
      .eq("owner_type", "USER")
      .eq("status", "OPEN");
    const exposure = (openRows ?? []).reduce((a, r) => a + Number(r.position_size), 0);
    if (exposure + data.positionSize > Number(session.user_cash)) {
      fail("Position size exceeds your available Arena capital.");
    }

    const { error } = await admin.from("arena_trades").insert({
      arena_session_id: String(session.id),
      owner_type: "USER",
      symbol: data.symbol,
      asset_type: ARENA_UNIVERSE.indexOf(data.symbol) < 4 ? "STOCK" : "CRYPTO",
      direction: data.direction,
      quantity: data.positionSize / entry,
      position_size: data.positionSize,
      entry_price: entry,
      current_price: entry,
      stop_loss: data.stopLoss,
      take_profit: data.takeProfit,
      status: "OPEN",
      unrealized_pnl: 0,
    });
    if (error) fail("Unable to open this Arena trade. Please check your parameters.");

    return { entryPrice: entry };
  });

export const closeArenaTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tradeId: string }) => {
    if (!data?.tradeId) fail("Missing trade.");
    return { tradeId: String(data.tradeId) };
  })
  .handler(async ({ data, context }) => {
    const { admin } = await deps();
    const { pnlFor } = await import("./engine.server");

    const { data: trade } = await admin
      .from("arena_trades")
      .select("*, ai_arena_sessions!inner(id, user_id, user_cash, status)")
      .eq("id", data.tradeId)
      .eq("owner_type", "USER")
      .maybeSingle();
    if (!trade) fail("Trade not found.");
    const session = trade.ai_arena_sessions as unknown as {
      id: string;
      user_id: string;
      user_cash: number;
      status: string;
    };
    if (session.user_id !== context.userId) fail("Trade not found.");
    if (trade.status !== "OPEN") fail("This Arena trade is already closed.");

    const { getMarketDataProvider } = await import("./market/provider.server");
    let price: number;
    try {
      price = (await getMarketDataProvider().getLatestPrice(String(trade.symbol))).price;
    } catch {
      fail("Market data is temporarily unavailable. Please try again later.");
    }
    if (!Number.isFinite(price) || price <= 0) fail("Market data is temporarily unavailable. Please try again later.");

    const pnl = pnlFor(
      trade.direction as "BUY" | "SELL",
      Number(trade.entry_price),
      price,
      Number(trade.position_size),
    );

    await admin
      .from("arena_trades")
      .update({
        exit_price: price,
        current_price: price,
        pnl,
        unrealized_pnl: 0,
        status: "CLOSED",
        closed_at: new Date().toISOString(),
      })
      .eq("id", trade.id);

    await admin
      .from("ai_arena_sessions")
      .update({ user_cash: Math.round((Number(session.user_cash) + pnl) * 100) / 100 })
      .eq("id", session.id);

    return { exitPrice: price, pnl };
  });

/** Ends the challenge early at the user's own request and scores it immediately. */
export const endArenaNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin, finalizeSession } = await deps();
    const { data: session } = await admin
      .from("ai_arena_sessions")
      .select("*")
      .eq("user_id", context.userId)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (!session) fail("You do not have an active AI Arena challenge.");
    const result = await finalizeSession(admin, session as Record<string, unknown>);
    return { winner: result?.winner ?? "DRAW", summary: result?.summary ?? "" };
  });
