/**
 * Version 1.4 Social Competition engine (server-only).
 *
 * Every value that decides a competition — participant cash, mark-to-market
 * equity, Simulation Competition Score, ranking, winner, XP and badges — is
 * derived here from verified database rows and real market data. The client
 * can never write competition state.
 */
import { pnlFor, addNotification, awardXp, grantBadge, recomputeProfile } from "../engine.server";

import {
  COMPETITION_SCORE_WEIGHTS,
  COMPETITION_XP,
  PUBLIC_CHALLENGE_DEFAULTS,
  TOURNAMENT_DEFAULTS,
} from "./config";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export interface CompetitionTradeRow {
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

function toTrade(row: Record<string, unknown>): CompetitionTradeRow {
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
    closed_at: row["closed_at"] == null ? null : String(row["closed_at"]),
  };
}

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

export interface Portfolio {
  cash: number;
  equity: number;
  openPnl: number;
  realizedPnl: number;
  returnPct: number;
  drawdown: number;
  openTrades: CompetitionTradeRow[];
  closedTrades: CompetitionTradeRow[];
  marketDataOk: boolean;
}

/** Applies stop loss / take profit, marks open positions and returns the portfolio. */
export async function markToMarket(
  admin: Admin,
  participantId: string,
  startingBalance: number,
  cash: number,
): Promise<Portfolio> {
  const { data: rows } = await admin
    .from("competition_trades")
    .select("*")
    .eq("participant_id", participantId)
    .order("opened_at", { ascending: false });
  const trades = (rows ?? []).map(toTrade);
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
          .from("competition_trades")
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
        t.current_price = price;
        t.unrealized_pnl = pnlFor(t.direction, t.entry_price, price, t.position_size);
      }
    }

    if (workingCash !== cash) {
      await admin.from("competition_participants").update({ cash: workingCash }).eq("id", participantId);
    }
  }

  const stillOpen = trades.filter((t) => t.status === "OPEN");
  const closed = trades.filter((t) => t.status !== "OPEN");
  const openPnl = stillOpen.reduce((a, t) => a + (t.unrealized_pnl ?? 0), 0);
  const realizedPnl = closed.reduce((a, t) => a + (t.pnl ?? 0), 0);
  const equity = Math.round((workingCash + openPnl) * 100) / 100;

  return {
    cash: workingCash,
    equity,
    openPnl: Math.round(openPnl * 100) / 100,
    realizedPnl: Math.round(realizedPnl * 100) / 100,
    returnPct: Math.round(((equity - startingBalance) / startingBalance) * 10000) / 100,
    drawdown: maxDrawdownPct(closed, startingBalance),
    openTrades: stillOpen,
    closedTrades: closed,
    marketDataOk,
  };
}

function maxDrawdownPct(closed: CompetitionTradeRow[], startingBalance: number): number {
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
  return Math.round(maxDd * 100) / 100;
}

export interface CompetitionScore {
  total: number;
  returnScore: number;
  riskScore: number;
  drawdownScore: number;
  consistencyScore: number;
}

/**
 * Simulation Competition Score — deterministic and server-only.
 * return 40% + risk management 25% + drawdown control 20% + consistency 15%.
 */
export function computeCompetitionScore(
  trades: CompetitionTradeRow[],
  startingBalance: number,
  equity: number,
): CompetitionScore {
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

  const drawdownScore = clamp(100 - maxDrawdownPct(closed, startingBalance) * 8);

  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate = closed.length ? wins / closed.length : 0;
  const activity = Math.min(closed.length / 5, 1);
  const consistencyScore = clamp(winRate * 70 + activity * 30);

  const total =
    returnScore * COMPETITION_SCORE_WEIGHTS.return +
    riskScore * COMPETITION_SCORE_WEIGHTS.risk +
    drawdownScore * COMPETITION_SCORE_WEIGHTS.drawdown +
    consistencyScore * COMPETITION_SCORE_WEIGHTS.consistency;

  return {
    total: Math.round(total * 10) / 10,
    returnScore: Math.round(returnScore),
    riskScore: Math.round(riskScore),
    drawdownScore: Math.round(drawdownScore),
    consistencyScore: Math.round(consistencyScore),
  };
}

/* ------------------------------------------------------------------ */
/* Server-managed competitions                                         */
/* ------------------------------------------------------------------ */

export function weekKey(d = new Date()): string {
  const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - first.getTime()) / 86400000 + first.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Makes sure the current weekly tournament and the rolling open public
 * challenge exist. Both are created by the server only, with identical
 * virtual capital and identical start/end times for everyone.
 */
export async function ensureOpenCompetitions(admin: Admin) {
  const now = new Date();

  const seeds = [
    {
      kind: "TOURNAMENT" as const,
      periodKey: weekKey(now),
      ...TOURNAMENT_DEFAULTS,
    },
    {
      kind: "PUBLIC" as const,
      periodKey: dayKey(now),
      ...PUBLIC_CHALLENGE_DEFAULTS,
    },
  ];

  for (const seed of seeds) {
    const { data: existing } = await admin
      .from("competitions")
      .select("id")
      .eq("kind", seed.kind)
      .eq("period_key", seed.periodKey)
      .maybeSingle();
    if (existing) continue;

    await admin.from("competitions").insert({
      kind: seed.kind,
      title: seed.title,
      status: "ACTIVE",
      starting_balance: seed.startingBalance,
      market_category: seed.marketCategory,
      duration_days: seed.durationDays,
      start_time: now.toISOString(),
      end_time: new Date(now.getTime() + seed.durationDays * 86_400_000).toISOString(),
      is_public: true,
      max_participants: 10000,
      period_key: seed.periodKey,
    });
  }
}

/** Finalises any competition whose server-side end time has passed. */
export async function syncDueCompetitions(admin: Admin, userId: string) {
  const { data: mine } = await admin
    .from("competition_participants")
    .select("competition_id")
    .eq("user_id", userId);
  const ids = [...new Set((mine ?? []).map((r) => String(r.competition_id)))];
  if (!ids.length) return;

  const { data: due } = await admin
    .from("competitions")
    .select("*")
    .in("id", ids)
    .eq("status", "ACTIVE")
    .lte("end_time", new Date().toISOString());

  for (const competition of due ?? []) {
    await finalizeCompetition(admin, competition as Record<string, unknown>);
  }

  // Friend challenges nobody accepted expire after their full duration.
  await admin
    .from("competitions")
    .update({ status: "EXPIRED" })
    .in("id", ids)
    .eq("status", "WAITING_FOR_OPPONENT")
    .lte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString());
}

export interface Standing {
  userId: string;
  username: string;
  level: number;
  score: number;
  returnPct: number;
  equity: number;
  drawdown: number;
  rank: number;
}

/** Marks every participant to market and returns the live standings. */
export async function standingsFor(
  admin: Admin,
  competition: Record<string, unknown>,
  limit = 50,
): Promise<{ standings: Standing[]; marketDataOk: boolean }> {
  const startingBalance = Number(competition["starting_balance"]);
  const { data: participants } = await admin
    .from("competition_participants")
    .select("id, user_id, cash")
    .eq("competition_id", String(competition["id"]))
    .limit(limit);

  const rows: (Standing & { participantId: string })[] = [];
  let marketDataOk = true;

  for (const p of participants ?? []) {
    const portfolio = await markToMarket(admin, String(p.id), startingBalance, Number(p.cash));
    if (!portfolio.marketDataOk) marketDataOk = false;
    const score = computeCompetitionScore(
      [...portfolio.openTrades, ...portfolio.closedTrades],
      startingBalance,
      portfolio.equity,
    );
    rows.push({
      participantId: String(p.id),
      userId: String(p.user_id),
      username: "Trader",
      level: 1,
      score: score.total,
      returnPct: portfolio.returnPct,
      equity: portfolio.equity,
      drawdown: portfolio.drawdown,
      rank: 0,
    });
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, level")
    .in("id", rows.length ? rows.map((r) => r.userId) : ["00000000-0000-0000-0000-000000000000"]);
  const profileOf = new Map((profiles ?? []).map((p) => [String(p.id), p]));

  rows.sort((a, b) => b.score - a.score || b.returnPct - a.returnPct);
  rows.forEach((r, i) => {
    r.rank = i + 1;
    const profile = profileOf.get(r.userId);
    if (profile) {
      r.username = String(profile.username);
      r.level = Number(profile.level);
    }
  });

  // Persist the derived numbers so rankings survive without recomputation.
  for (const r of rows) {
    await admin
      .from("competition_participants")
      .update({ score: r.score, return_pct: r.returnPct, equity: r.equity, drawdown: r.drawdown, rank: r.rank })
      .eq("id", r.participantId);
  }

  return {
    standings: rows.map(({ participantId: _p, ...rest }) => rest),
    marketDataOk,
  };
}

/** Closes remaining positions, ranks everyone and pays virtual rewards once. */
export async function finalizeCompetition(admin: Admin, competition: Record<string, unknown>) {
  const competitionId = String(competition["id"]);
  const startingBalance = Number(competition["starting_balance"]);

  const { data: participants } = await admin
    .from("competition_participants")
    .select("id, user_id, cash, rewarded")
    .eq("competition_id", competitionId);

  // Close everything still open at the latest available price.
  for (const p of participants ?? []) {
    const portfolio = await markToMarket(admin, String(p.id), startingBalance, Number(p.cash));
    let cash = portfolio.cash;
    for (const t of portfolio.openTrades) {
      const price = t.current_price ?? t.entry_price;
      const pnl = pnlFor(t.direction, t.entry_price, price, t.position_size);
      cash = Math.round((cash + pnl) * 100) / 100;
      await admin
        .from("competition_trades")
        .update({
          exit_price: price,
          current_price: price,
          pnl,
          unrealized_pnl: 0,
          status: "CLOSED",
          closed_at: new Date().toISOString(),
        })
        .eq("id", t.id);
    }
    if (cash !== portfolio.cash) {
      await admin.from("competition_participants").update({ cash }).eq("id", p.id);
    }
  }

  const { standings } = await standingsFor(admin, competition, 10000);

  await admin
    .from("competitions")
    .update({
      status: "COMPLETED",
      result_summary: standings.length
        ? `${standings[0]!.username} finished first with a Simulation Competition Score of ${standings[0]!.score}.`
        : "No participants took part in this simulated competition.",
    })
    .eq("id", competitionId);

  const kind = String(competition["kind"]);
  for (const s of standings) {
    const participant = (participants ?? []).find((p) => String(p.user_id) === s.userId);
    if (!participant || participant.rewarded) continue;

    await admin.from("competition_participants").update({ rewarded: true }).eq("id", participant.id);

    await awardXp(admin, s.userId, COMPETITION_XP.COMPLETE, `COMPETITION_COMPLETE:${competitionId}`);
    if (s.rank === 1) {
      await awardXp(admin, s.userId, COMPETITION_XP.WIN, `COMPETITION_WIN:${competitionId}`);
      if (kind === "FRIEND") await grantBadge(admin, s.userId, "friend_challenge_winner");
    } else if (s.rank <= 10 && kind === "TOURNAMENT") {
      await awardXp(admin, s.userId, COMPETITION_XP.TOP_10, `COMPETITION_TOP10:${competitionId}`);
    }
    if (kind === "TOURNAMENT") {
      await grantBadge(admin, s.userId, "tournament_finisher");
      if (s.rank <= 10) await grantBadge(admin, s.userId, "tournament_top10");
    }

    await addNotification(
      admin,
      s.userId,
      "Competition result available",
      `${String(competition["title"])}: you finished #${s.rank} with a Simulation Competition Score of ${s.score}.`,
      "COMPETITION",
    );
    await recomputeProfile(admin, s.userId);
  }

  return standings;
}
