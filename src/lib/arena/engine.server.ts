/**
 * AI Arena engine (server-only).
 *
 * All Arena state that matters — AI decisions, trade fills, timers, scores and
 * the winner — is produced here from verified database rows and real market
 * data. The client can never write any of it.
 */
import { pnlFor } from "../engine.server";
import type { Candle } from "../market/types";
import { ARENA_SCORE_WEIGHTS, ARENA_XP, arenaBot, ARENA_UNIVERSE, type ArenaBot } from "./bots";
import { strategyFor } from "./strategies.server";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

const HOUR_MS = 3_600_000;
/** Hard cap so a long-dormant session cannot spend unbounded work on one request. */
const MAX_CATCHUP_STEPS = 200;

export interface ArenaTradeRow {
  id: string;
  symbol: string;
  asset_type: string;
  direction: "BUY" | "SELL";
  position_size: number;
  quantity: number;
  entry_price: number;
  current_price: number | null;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  status: string;
  pnl: number | null;
  unrealized_pnl: number | null;
  opened_at: string;
  closed_at: string | null;
}

export function toArenaTrade(row: Record<string, unknown>): ArenaTradeRow {
  const num = (v: unknown) => (v == null ? null : Number(v));
  return {
    id: String(row["id"]),
    symbol: String(row["symbol"]),
    asset_type: String(row["asset_type"]),
    direction: row["direction"] as "BUY" | "SELL",
    position_size: Number(row["position_size"]),
    quantity: Number(row["quantity"]),
    entry_price: Number(row["entry_price"]),
    current_price: num(row["current_price"]),
    exit_price: num(row["exit_price"]),
    stop_loss: num(row["stop_loss"]),
    take_profit: num(row["take_profit"]),
    status: String(row["status"]),
    pnl: num(row["pnl"]),
    unrealized_pnl: num(row["unrealized_pnl"]),
    opened_at: String(row["opened_at"]),
    closed_at: (row["closed_at"] as string | null) ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Market data helpers                                                 */
/* ------------------------------------------------------------------ */

async function hourlyHistory(symbols: string[]): Promise<Map<string, Candle[]>> {
  const { getMarketDataProvider } = await import("../market/provider.server");
  const provider = getMarketDataProvider();
  const out = new Map<string, Candle[]>();
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const candles = await provider.getOHLC(symbol, "1h", 400);
        if (candles.length) out.set(symbol, candles);
      } catch {
        // Market data unavailable for this symbol — the strategy simply skips it.
        // No invented prices are ever substituted.
      }
    }),
  );
  return out;
}

/* ------------------------------------------------------------------ */
/* AI opponent simulation                                              */
/* ------------------------------------------------------------------ */

/**
 * Replays the AI opponent's rule-based strategy over every hour that elapsed
 * since the last tick, so Arena progress stays accurate whether or not the app
 * was open. Deterministic: same candles in, same decisions out.
 */
export async function runBotCatchUp(admin: Admin, session: Record<string, unknown>, bot: ArenaBot) {
  const sessionId = String(session["id"]);
  const endTime = new Date(String(session["end_time"])).getTime();
  const lastTick = new Date(String(session["last_bot_tick_at"])).getTime();
  const until = Math.min(Date.now(), endTime);
  if (until - lastTick < HOUR_MS) return;

  const history = await hourlyHistory(ARENA_UNIVERSE);
  if (history.size === 0) return; // no market data → no invented outcomes

  const { data: tradeRows } = await admin
    .from("arena_trades")
    .select("*")
    .eq("arena_session_id", sessionId)
    .eq("owner_type", "AI");
  const trades = (tradeRows ?? []).map(toArenaTrade);
  let open = trades.filter((t) => t.status === "OPEN");
  let cash = Number(session["ai_cash"]);
  const startingBalance = Number(session["starting_balance"]);
  const strategy = strategyFor(bot);

  const closes: { id: string; exit: number; pnl: number; status: string; at: string }[] = [];
  const opens: Record<string, unknown>[] = [];

  let lastOpenedAt = trades.reduce(
    (acc, t) => Math.max(acc, new Date(t.opened_at).getTime()),
    0,
  );

  const steps = Math.min(Math.floor((until - lastTick) / HOUR_MS), MAX_CATCHUP_STEPS);
  for (let i = 1; i <= steps; i++) {
    const stamp = lastTick + i * HOUR_MS;
    const stampSec = Math.floor(stamp / 1000);

    // 1) Resolve stop loss / take profit on the candle for this hour.
    for (const t of [...open]) {
      const candles = history.get(t.symbol);
      const candle = candles?.find((c) => c.time <= stampSec && c.time > stampSec - 3600);
      if (!candle) continue;
      let exit: number | null = null;
      let status = "CLOSED";
      if (t.direction === "BUY") {
        if (t.stop_loss != null && candle.low <= t.stop_loss) {
          exit = t.stop_loss;
          status = "STOP_LOSS_HIT";
        } else if (t.take_profit != null && candle.high >= t.take_profit) {
          exit = t.take_profit;
          status = "TAKE_PROFIT_HIT";
        }
      } else {
        if (t.stop_loss != null && candle.high >= t.stop_loss) {
          exit = t.stop_loss;
          status = "STOP_LOSS_HIT";
        } else if (t.take_profit != null && candle.low <= t.take_profit) {
          exit = t.take_profit;
          status = "TAKE_PROFIT_HIT";
        }
      }
      if (exit != null) {
        const pnl = pnlFor(t.direction, t.entry_price, exit, t.position_size);
        cash = Math.round((cash + pnl) * 100) / 100;
        closes.push({ id: t.id, exit, pnl, status, at: new Date(stamp).toISOString() });
        open = open.filter((o) => o.id !== t.id);
      }
    }

    // 2) Consider a new simulated position, respecting the strategy cooldown.
    if (open.length >= bot.config.maxOpen) continue;
    if (stamp - lastOpenedAt < bot.config.cooldownHours * HOUR_MS) continue;

    let best: { symbol: string; direction: "BUY" | "SELL"; price: number; strength: number } | null = null;
    for (const symbol of ARENA_UNIVERSE) {
      if (open.some((o) => o.symbol === symbol)) continue;
      const candles = history.get(symbol);
      if (!candles) continue;
      const upto = candles.filter((c) => c.time <= stampSec);
      if (upto.length < 50) continue;
      const signal = strategy.evaluateMarket(upto);
      if (!signal) continue;
      if (signal.direction === "SELL" && !bot.config.allowShort) continue;
      const price = upto[upto.length - 1]!.close;
      if (!Number.isFinite(price) || price <= 0) continue;
      if (!best || signal.strength > best.strength) {
        best = { symbol, direction: signal.direction, price, strength: signal.strength };
      }
    }
    if (!best) continue;

    const size = Math.round(startingBalance * bot.config.sizePct * 100) / 100;
    const exposure = open.reduce((a, o) => a + o.position_size, 0);
    if (exposure + size > cash) continue;

    const sl =
      best.direction === "BUY"
        ? best.price * (1 - bot.config.stopLossPct)
        : best.price * (1 + bot.config.stopLossPct);
    const tp =
      best.direction === "BUY"
        ? best.price * (1 + bot.config.takeProfitPct)
        : best.price * (1 - bot.config.takeProfitPct);

    const row = {
      arena_session_id: sessionId,
      owner_type: "AI",
      symbol: best.symbol,
      asset_type: ARENA_UNIVERSE.indexOf(best.symbol) < 4 ? "STOCK" : "CRYPTO",
      direction: best.direction,
      quantity: size / best.price,
      position_size: size,
      entry_price: best.price,
      current_price: best.price,
      stop_loss: Math.round(sl * 1e6) / 1e6,
      take_profit: Math.round(tp * 1e6) / 1e6,
      status: "OPEN",
      unrealized_pnl: 0,
      opened_at: new Date(stamp).toISOString(),
    };
    opens.push(row);
    open.push(
      toArenaTrade({ ...row, id: `pending-${opens.length}`, exit_price: null, pnl: null, closed_at: null }),
    );
    lastOpenedAt = stamp;
  }

  for (const c of closes) {
    await admin
      .from("arena_trades")
      .update({
        exit_price: c.exit,
        current_price: c.exit,
        pnl: c.pnl,
        unrealized_pnl: 0,
        status: c.status,
        closed_at: c.at,
      })
      .eq("id", c.id);
  }
  if (opens.length) await admin.from("arena_trades").insert(opens);

  await admin
    .from("ai_arena_sessions")
    .update({
      ai_cash: cash,
      last_bot_tick_at: new Date(lastTick + steps * HOUR_MS).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

/* ------------------------------------------------------------------ */
/* Mark-to-market                                                      */
/* ------------------------------------------------------------------ */

export interface Portfolio {
  cash: number;
  equity: number;
  openPnl: number;
  realizedPnl: number;
  returnPct: number;
  openTrades: ArenaTradeRow[];
  closedTrades: ArenaTradeRow[];
  marketDataOk: boolean;
}

/**
 * Marks open Arena positions to the latest available market price and closes
 * any that reached their stop loss or take profit. If a price is unavailable
 * the last known price is kept — never an invented one.
 */
export async function markToMarket(
  admin: Admin,
  sessionId: string,
  ownerType: "USER" | "AI",
  startingBalance: number,
  cash: number,
): Promise<Portfolio> {
  const { data: rows } = await admin
    .from("arena_trades")
    .select("*")
    .eq("arena_session_id", sessionId)
    .eq("owner_type", ownerType)
    .order("opened_at", { ascending: false });
  const trades = (rows ?? []).map(toArenaTrade);
  const open = trades.filter((t) => t.status === "OPEN");
  let marketDataOk = true;
  let workingCash = cash;

  if (open.length) {
    const { getMarketDataProvider } = await import("../market/provider.server");
    const provider = getMarketDataProvider();
    const symbols = [...new Set(open.map((t) => t.symbol))];
    let quotes: { symbol: string; price: number }[] = [];
    try {
      quotes = provider.getLatestPrices
        ? await provider.getLatestPrices(symbols)
        : await Promise.all(symbols.map((s) => provider.getLatestPrice(s)));
    } catch {
      marketDataOk = false;
    }
    const priceOf = new Map(quotes.map((q) => [q.symbol, q.price]));

    for (const t of open) {
      const price = priceOf.get(t.symbol);
      if (price == null || !Number.isFinite(price) || price <= 0) {
        marketDataOk = false;
        continue;
      }
      let exit: number | null = null;
      let status = "CLOSED";
      if (t.direction === "BUY") {
        if (t.stop_loss != null && price <= t.stop_loss) (exit = t.stop_loss), (status = "STOP_LOSS_HIT");
        else if (t.take_profit != null && price >= t.take_profit) (exit = t.take_profit), (status = "TAKE_PROFIT_HIT");
      } else {
        if (t.stop_loss != null && price >= t.stop_loss) (exit = t.stop_loss), (status = "STOP_LOSS_HIT");
        else if (t.take_profit != null && price <= t.take_profit) (exit = t.take_profit), (status = "TAKE_PROFIT_HIT");
      }

      if (exit != null) {
        const pnl = pnlFor(t.direction, t.entry_price, exit, t.position_size);
        workingCash = Math.round((workingCash + pnl) * 100) / 100;
        t.status = status;
        t.exit_price = exit;
        t.pnl = pnl;
        t.unrealized_pnl = 0;
        t.closed_at = new Date().toISOString();
        await admin
          .from("arena_trades")
          .update({
            exit_price: exit,
            current_price: exit,
            pnl,
            unrealized_pnl: 0,
            status,
            closed_at: t.closed_at,
          })
          .eq("id", t.id);
      } else {
        const unrealized = pnlFor(t.direction, t.entry_price, price, t.position_size);
        t.current_price = price;
        t.unrealized_pnl = unrealized;
        await admin
          .from("arena_trades")
          .update({ current_price: price, unrealized_pnl: unrealized })
          .eq("id", t.id);
      }
    }
  }

  if (workingCash !== cash) {
    await admin
      .from("ai_arena_sessions")
      .update(ownerType === "USER" ? { user_cash: workingCash } : { ai_cash: workingCash })
      .eq("id", sessionId);
  }

  const stillOpen = trades.filter((t) => t.status === "OPEN");
  const closed = trades.filter((t) => t.status !== "OPEN");
  const openPnl = Math.round(stillOpen.reduce((a, t) => a + (t.unrealized_pnl ?? 0), 0) * 100) / 100;
  const realizedPnl = Math.round(closed.reduce((a, t) => a + (t.pnl ?? 0), 0) * 100) / 100;
  const equity = Math.round((workingCash + openPnl) * 100) / 100;

  return {
    cash: workingCash,
    equity,
    openPnl,
    realizedPnl,
    returnPct: Math.round(((equity - startingBalance) / startingBalance) * 10000) / 100,
    openTrades: stillOpen,
    closedTrades: closed,
    marketDataOk,
  };
}

/* ------------------------------------------------------------------ */
/* Arena scoring (server-side only)                                    */
/* ------------------------------------------------------------------ */

export interface ArenaScore {
  total: number;
  returnScore: number;
  riskScore: number;
  drawdownScore: number;
  consistencyScore: number;
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export function computeArenaScore(
  trades: ArenaTradeRow[],
  startingBalance: number,
  equity: number,
): ArenaScore {
  const closed = trades.filter((t) => t.status !== "OPEN");
  const returnPct = ((equity - startingBalance) / startingBalance) * 100;
  const returnScore = clamp(50 + returnPct * 5);

  const withProtection = closed.filter((t) => t.stop_loss != null && t.take_profit != null).length;
  const protectionShare = closed.length ? withProtection / closed.length : 0;
  const avgSizePct = closed.length
    ? closed.reduce((a, t) => a + t.position_size / startingBalance, 0) / closed.length
    : 0;
  const sizingScore = avgSizePct <= 0.1 ? 40 : clamp(40 - (avgSizePct - 0.1) * 200);
  const riskScore = clamp(protectionShare * 60 + sizingScore);

  let peak = startingBalance;
  let running = startingBalance;
  let maxDd = 0;
  for (const t of [...closed].sort(
    (a, b) => new Date(a.closed_at ?? a.opened_at).getTime() - new Date(b.closed_at ?? b.opened_at).getTime(),
  )) {
    running += t.pnl ?? 0;
    peak = Math.max(peak, running);
    maxDd = Math.max(maxDd, ((peak - running) / peak) * 100);
  }
  const drawdownScore = clamp(100 - maxDd * 8);

  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate = closed.length ? wins / closed.length : 0;
  const activity = Math.min(closed.length / 5, 1);
  const consistencyScore = clamp(winRate * 70 + activity * 30);

  const total =
    returnScore * ARENA_SCORE_WEIGHTS.return +
    riskScore * ARENA_SCORE_WEIGHTS.risk +
    drawdownScore * ARENA_SCORE_WEIGHTS.drawdown +
    consistencyScore * ARENA_SCORE_WEIGHTS.consistency;

  return {
    total: Math.round(total * 10) / 10,
    returnScore: Math.round(returnScore),
    riskScore: Math.round(riskScore),
    drawdownScore: Math.round(drawdownScore),
    consistencyScore: Math.round(consistencyScore),
  };
}

/* ------------------------------------------------------------------ */
/* Completion                                                          */
/* ------------------------------------------------------------------ */

/** Closes every open Arena position, scores both sides and stores the result. */
export async function finalizeSession(admin: Admin, session: Record<string, unknown>) {
  const sessionId = String(session["id"]);
  const userId = String(session["user_id"]);
  const bot = arenaBot(String(session["bot_id"]));
  if (!bot) return;
  const startingBalance = Number(session["starting_balance"]);

  const user = await markToMarket(admin, sessionId, "USER", startingBalance, Number(session["user_cash"]));
  const ai = await markToMarket(admin, sessionId, "AI", startingBalance, Number(session["ai_cash"]));

  // Close whatever is still open at the latest available price.
  for (const side of [
    { p: user, type: "USER" as const },
    { p: ai, type: "AI" as const },
  ]) {
    let cash = side.p.cash;
    for (const t of side.p.openTrades) {
      const exit = t.current_price ?? t.entry_price;
      const pnl = pnlFor(t.direction, t.entry_price, exit, t.position_size);
      cash = Math.round((cash + pnl) * 100) / 100;
      t.status = "CLOSED";
      t.exit_price = exit;
      t.pnl = pnl;
      t.unrealized_pnl = 0;
      t.closed_at = new Date().toISOString();
      await admin
        .from("arena_trades")
        .update({ exit_price: exit, current_price: exit, pnl, unrealized_pnl: 0, status: "CLOSED", closed_at: t.closed_at })
        .eq("id", t.id);
    }
    side.p.cash = cash;
    side.p.equity = cash;
    side.p.closedTrades = [...side.p.closedTrades, ...side.p.openTrades];
    side.p.openTrades = [];
    side.p.returnPct = Math.round(((cash - startingBalance) / startingBalance) * 10000) / 100;
  }

  const userScore = computeArenaScore(user.closedTrades, startingBalance, user.equity);
  const aiScore = computeArenaScore(ai.closedTrades, startingBalance, ai.equity);
  const diff = userScore.total - aiScore.total;
  const winner = Math.abs(diff) < 0.5 ? "DRAW" : diff > 0 ? "USER" : "AI";

  const summary =
    winner === "USER"
      ? `You outperformed ${bot.name} on risk-adjusted simulation performance (${userScore.total} vs ${aiScore.total} Arena Score).`
      : winner === "AI"
        ? `${bot.name}'s simulated strategy scored higher this time (${aiScore.total} vs ${userScore.total} Arena Score).`
        : `You and ${bot.name} finished level on Arena Score (${userScore.total}).`;

  await admin
    .from("ai_arena_sessions")
    .update({
      status: "COMPLETED",
      user_cash: user.cash,
      ai_cash: ai.cash,
      user_score: userScore.total,
      ai_score: aiScore.total,
      user_return: user.returnPct,
      ai_return: ai.returnPct,
      winner,
      result_summary: summary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  const { awardXp, recomputeProfile, grantBadge, addNotification } = await import("../engine.server");
  await awardXp(admin, userId, ARENA_XP.COMPLETE, "ARENA_COMPLETE");
  await grantBadge(admin, userId, "ai_challenger");
  if (winner === "USER") {
    await awardXp(admin, userId, ARENA_XP.WIN[bot.difficulty], "ARENA_WIN");
    await grantBadge(admin, userId, "ai_slayer");
    await grantBadge(admin, userId, bot.badgeCode);
    const { count } = await admin
      .from("ai_arena_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("winner", "USER");
    if ((count ?? 0) >= 3) await grantBadge(admin, userId, "ai_master");
  }
  await addNotification(
    admin,
    userId,
    "AI Arena finished",
    summary,
    "ARENA",
  );
  await recomputeProfile(admin, userId);

  return { winner, userScore, aiScore, summary };
}
