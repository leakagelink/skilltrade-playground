import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  BALANCE_PRESETS,
  COMPETITION_XP,
  COUNTRIES,
  DURATION_PRESETS,
  MARKET_CATEGORIES,
  type MarketCategory,
} from "./compete/config";
import { CATALOG } from "./market/catalog";

/**
 * Version 1.4 Social Competition server functions.
 *
 * Everything competitive is server-authoritative: identity comes from the
 * session, entry prices come from the market provider, and balances, scores,
 * rankings and rewards are computed on the server. Competitions are simulated
 * only — no money, entry fee, wager or cash prize exists anywhere in this file.
 */
export class CompeteError extends Error {}

function fail(message: string): never {
  throw new CompeteError(message);
}

async function deps() {
  const [{ supabaseAdmin }, engine] = await Promise.all([
    import("@/integrations/supabase/client.server"),
    import("./compete/engine.server"),
  ]);
  return { admin: supabaseAdmin, ...engine };
}

function inviteCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

function serializeCompetition(c: Record<string, unknown>) {
  return {
    id: String(c["id"]),
    kind: String(c["kind"]),
    title: String(c["title"]),
    status: String(c["status"]),
    startingBalance: Number(c["starting_balance"]),
    marketCategory: String(c["market_category"]),
    durationDays: Number(c["duration_days"]),
    startTime: (c["start_time"] as string | null) ?? null,
    endTime: (c["end_time"] as string | null) ?? null,
    inviteCode: (c["invite_code"] as string | null) ?? null,
    isPublic: Boolean(c["is_public"]),
    createdBy: (c["created_by"] as string | null) ?? null,
    resultSummary: (c["result_summary"] as string | null) ?? null,
  };
}

function symbolsFor(category: string) {
  return CATALOG.filter((a) => category === "ALL" || a.assetType === category).map((a) => a.symbol);
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export const getCompeteOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { admin, ensureOpenCompetitions, syncDueCompetitions } = await deps();

    await ensureOpenCompetitions(admin);
    await syncDueCompetitions(admin, userId);

    const { data: mine } = await admin
      .from("competition_participants")
      .select("competition_id, rank, score, return_pct")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false })
      .limit(30);
    const myIds = (mine ?? []).map((m) => String(m.competition_id));

    const { data: myCompetitions } = myIds.length
      ? await admin.from("competitions").select("*").in("id", myIds).order("created_at", { ascending: false })
      : { data: [] as Record<string, unknown>[] };

    const { data: open } = await admin
      .from("competitions")
      .select("*")
      .eq("is_public", true)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(20);

    const statsOf = new Map((mine ?? []).map((m) => [String(m.competition_id), m]));

    const { data: profile } = await admin
      .from("profiles")
      .select("country, show_country, is_public_profile, is_leaderboard_visible")
      .eq("id", userId)
      .maybeSingle();

    return {
      mine: (myCompetitions ?? []).map((c) => ({
        ...serializeCompetition(c as Record<string, unknown>),
        myRank: statsOf.get(String(c["id"]))?.rank ?? null,
        myScore: statsOf.get(String(c["id"]))?.score ?? null,
        myReturn: statsOf.get(String(c["id"]))?.return_pct ?? null,
      })),
      open: (open ?? [])
        .filter((c) => !myIds.includes(String(c["id"])))
        .map((c) => serializeCompetition(c as Record<string, unknown>)),
      privacy: {
        country: (profile?.country as string | null) ?? null,
        showCountry: Boolean(profile?.show_country),
        isPublicProfile: Boolean(profile?.is_public_profile),
        isLeaderboardVisible: Boolean(profile?.is_leaderboard_visible),
      },
    };
  });

/* ------------------------------------------------------------------ */
/* Create / join                                                       */
/* ------------------------------------------------------------------ */

export const createFriendChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { durationDays: number; startingBalance: number; marketCategory: MarketCategory }) => {
    const durationDays = Number(data?.durationDays);
    const startingBalance = Number(data?.startingBalance);
    const marketCategory = (data?.marketCategory ?? "ALL") as MarketCategory;
    if (!DURATION_PRESETS.includes(durationDays as 1 | 3 | 7)) fail("Choose a 1, 3 or 7 day challenge.");
    if (!BALANCE_PRESETS.includes(startingBalance as 10000 | 50000 | 100000)) fail("Choose a valid virtual balance.");
    if (!MARKET_CATEGORIES.some((m) => m.value === marketCategory)) fail("Choose a valid market category.");
    return { durationDays, startingBalance, marketCategory };
  })
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { admin } = await deps();

    const { count } = await admin
      .from("competitions")
      .select("id", { count: "exact", head: true })
      .eq("created_by", userId)
      .eq("status", "WAITING_FOR_OPPONENT");
    if ((count ?? 0) >= 5) fail("You already have several open invitations. Cancel one before creating another.");

    const code = inviteCode();
    const { data: competition, error } = await admin
      .from("competitions")
      .insert({
        kind: "FRIEND",
        title: `${data.durationDays}-Day Friend Challenge`,
        status: "WAITING_FOR_OPPONENT",
        starting_balance: data.startingBalance,
        market_category: data.marketCategory,
        duration_days: data.durationDays,
        created_by: userId,
        invite_code: code,
        max_participants: 2,
        is_public: false,
      })
      .select("*")
      .single();
    if (error || !competition) fail("Could not create the challenge. Please try again.");

    await admin.from("competition_participants").insert({
      competition_id: competition.id,
      user_id: userId,
      cash: data.startingBalance,
    });

    return { competition: serializeCompetition(competition as Record<string, unknown>) };
  });

export const cancelCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { competitionId: string }) => ({ competitionId: String(data?.competitionId ?? "") }))
  .handler(async ({ data, context }) => {
    const { admin } = await deps();
    const { data: competition } = await admin
      .from("competitions")
      .select("*")
      .eq("id", data.competitionId)
      .maybeSingle();
    if (!competition) fail("Challenge not found.");
    if (String(competition.created_by) !== context.userId) fail("Only the creator can cancel this challenge.");
    if (String(competition.status) !== "WAITING_FOR_OPPONENT") fail("This challenge has already started.");
    await admin.from("competitions").update({ status: "CANCELLED" }).eq("id", data.competitionId);
    return { ok: true };
  });

async function joinCompetitionRow(
  admin: Awaited<ReturnType<typeof deps>>["admin"],
  competition: Record<string, unknown>,
  userId: string,
) {
  const competitionId = String(competition["id"]);
  const status = String(competition["status"]);
  if (status === "COMPLETED" || status === "EXPIRED" || status === "CANCELLED") {
    fail("This competition is no longer open to join.");
  }

  const { data: existing } = await admin
    .from("competition_participants")
    .select("id")
    .eq("competition_id", competitionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return { competitionId, alreadyJoined: true };

  const { count } = await admin
    .from("competition_participants")
    .select("id", { count: "exact", head: true })
    .eq("competition_id", competitionId);
  if ((count ?? 0) >= Number(competition["max_participants"])) fail("This competition is already full.");

  const { error } = await admin.from("competition_participants").insert({
    competition_id: competitionId,
    user_id: userId,
    cash: Number(competition["starting_balance"]),
  });
  if (error) fail("Could not join this competition. Please try again.");

  // A friend challenge starts the moment the second trader accepts, with the
  // same start and end time for both sides.
  if (String(competition["kind"]) === "FRIEND" && (count ?? 0) + 1 >= 2) {
    const now = new Date();
    const end = new Date(now.getTime() + Number(competition["duration_days"]) * 86_400_000);
    await admin
      .from("competitions")
      .update({ status: "ACTIVE", start_time: now.toISOString(), end_time: end.toISOString() })
      .eq("id", competitionId);

    const { addNotification } = await import("./engine.server");
    const creator = competition["created_by"] as string | null;
    if (creator) {
      await addNotification(
        admin,
        creator,
        "Your friend challenge started",
        "Someone accepted your simulated trading challenge. Good luck!",
        "COMPETITION",
      );
    }
  }

  const { awardXp, grantBadge } = await import("./engine.server");
  await awardXp(admin, userId, COMPETITION_XP.JOIN, `COMPETITION_JOIN:${competitionId}`);
  await grantBadge(admin, userId, "competitor");

  return { competitionId, alreadyJoined: false };
}

export const joinCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { competitionId: string }) => ({ competitionId: String(data?.competitionId ?? "") }))
  .handler(async ({ data, context }) => {
    const { admin } = await deps();
    const { data: competition } = await admin
      .from("competitions")
      .select("*")
      .eq("id", data.competitionId)
      .eq("is_public", true)
      .maybeSingle();
    if (!competition) fail("Competition not found.");
    return joinCompetitionRow(admin, competition as Record<string, unknown>, context.userId);
  });

export const joinByInviteCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => ({ code: String(data?.code ?? "").toUpperCase().trim() }))
  .handler(async ({ data, context }) => {
    if (data.code.length < 6) fail("That invitation code is not valid.");
    const { admin } = await deps();
    const { data: competition } = await admin
      .from("competitions")
      .select("*")
      .eq("invite_code", data.code)
      .maybeSingle();
    if (!competition) fail("That invitation is not valid or has expired.");
    if (String(competition.created_by) === context.userId) {
      return { competitionId: String(competition.id), alreadyJoined: true };
    }
    return joinCompetitionRow(admin, competition as Record<string, unknown>, context.userId);
  });

/* ------------------------------------------------------------------ */
/* Competition detail + trading                                        */
/* ------------------------------------------------------------------ */

export const getCompetition = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { competitionId: string }) => ({ competitionId: String(data?.competitionId ?? "") }))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { admin, markToMarket, computeCompetitionScore, standingsFor, finalizeCompetition } = await deps();

    let { data: competition } = await admin
      .from("competitions")
      .select("*")
      .eq("id", data.competitionId)
      .maybeSingle();
    if (!competition) fail("Competition not found.");

    if (
      String(competition.status) === "ACTIVE" &&
      competition.end_time &&
      new Date(String(competition.end_time)).getTime() <= Date.now()
    ) {
      await finalizeCompetition(admin, competition as Record<string, unknown>);
      const { data: refreshed } = await admin.from("competitions").select("*").eq("id", data.competitionId).single();
      competition = refreshed ?? competition;
    }

    const { data: participant } = await admin
      .from("competition_participants")
      .select("*")
      .eq("competition_id", data.competitionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!participant && !competition.is_public) fail("You do not have access to this challenge.");

    const startingBalance = Number(competition.starting_balance);
    const me = participant
      ? await markToMarket(admin, String(participant.id), startingBalance, Number(participant.cash))
      : null;

    const { standings, marketDataOk } = await standingsFor(admin, competition as Record<string, unknown>, 100);

    return {
      competition: serializeCompetition(competition as Record<string, unknown>),
      serverNow: new Date().toISOString(),
      symbols: symbolsFor(String(competition.market_category)),
      marketDataOk: marketDataOk && (me?.marketDataOk ?? true),
      participantCount: standings.length,
      standings,
      me: me
        ? {
            cash: me.cash,
            equity: me.equity,
            openPnl: me.openPnl,
            realizedPnl: me.realizedPnl,
            returnPct: me.returnPct,
            drawdown: me.drawdown,
            score: computeCompetitionScore([...me.openTrades, ...me.closedTrades], startingBalance, me.equity),
            openTrades: me.openTrades,
            closedTrades: me.closedTrades.slice(0, 25),
          }
        : null,
    };
  });

export const openCompetitionTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    competitionId: string;
    symbol: string;
    direction: "BUY" | "SELL";
    positionSize: number;
    stopLoss?: number | null;
    takeProfit?: number | null;
  }) => {
    const size = Number(data?.positionSize);
    if (data?.direction !== "BUY" && data?.direction !== "SELL") fail("Invalid trade direction.");
    if (!Number.isFinite(size) || size <= 0) fail("Enter a valid position size.");
    return {
      competitionId: String(data.competitionId ?? ""),
      symbol: String(data.symbol ?? "").toUpperCase(),
      direction: data.direction,
      positionSize: Math.round(size * 100) / 100,
      stopLoss: data.stopLoss ? Number(data.stopLoss) : null,
      takeProfit: data.takeProfit ? Number(data.takeProfit) : null,
    };
  })
  .handler(async ({ data, context }) => {
    const { admin, markToMarket } = await deps();

    const { data: competition } = await admin
      .from("competitions")
      .select("*")
      .eq("id", data.competitionId)
      .maybeSingle();
    if (!competition) fail("Competition not found.");
    if (String(competition.status) !== "ACTIVE") fail("This competition is not currently live.");
    if (competition.end_time && new Date(String(competition.end_time)).getTime() <= Date.now()) {
      fail("This competition has ended.");
    }
    if (!symbolsFor(String(competition.market_category)).includes(data.symbol)) {
      fail("This asset is not available in this competition.");
    }

    const { data: participant } = await admin
      .from("competition_participants")
      .select("*")
      .eq("competition_id", data.competitionId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!participant) fail("Join this competition before placing a simulated trade.");

    const startingBalance = Number(competition.starting_balance);
    const portfolio = await markToMarket(admin, String(participant.id), startingBalance, Number(participant.cash));
    const exposure = portfolio.openTrades.reduce((a, t) => a + t.position_size, 0);
    if (exposure + data.positionSize > portfolio.equity) {
      fail("This position is larger than your available virtual balance in this competition.");
    }

    const { getMarketDataProvider } = await import("./market/provider.server");
    let entry: number;
    try {
      const quote = await getMarketDataProvider().getLatestPrice(data.symbol);
      entry = Number(quote.price);
    } catch {
      fail("Live market data is unavailable right now. Please try again shortly.");
    }
    if (!Number.isFinite(entry) || entry <= 0) fail("Live market data is unavailable right now.");

    if (data.direction === "BUY") {
      if (data.stopLoss != null && data.stopLoss >= entry) fail("Stop loss must be below the entry price.");
      if (data.takeProfit != null && data.takeProfit <= entry) fail("Take profit must be above the entry price.");
    } else {
      if (data.stopLoss != null && data.stopLoss <= entry) fail("Stop loss must be above the entry price.");
      if (data.takeProfit != null && data.takeProfit >= entry) fail("Take profit must be below the entry price.");
    }

    const asset = CATALOG.find((a) => a.symbol === data.symbol);
    const { error } = await admin.from("competition_trades").insert({
      participant_id: participant.id,
      competition_id: data.competitionId,
      symbol: data.symbol,
      asset_type: asset?.assetType ?? "STOCK",
      direction: data.direction,
      quantity: Math.round((data.positionSize / entry) * 1e8) / 1e8,
      position_size: data.positionSize,
      entry_price: entry,
      current_price: entry,
      stop_loss: data.stopLoss,
      take_profit: data.takeProfit,
      status: "OPEN",
    });
    if (error) fail("Could not place this simulated trade. Please try again.");

    return { ok: true, entry };
  });

export const closeCompetitionTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tradeId: string }) => ({ tradeId: String(data?.tradeId ?? "") }))
  .handler(async ({ data, context }) => {
    const { admin } = await deps();
    const { pnlFor } = await import("./engine.server");

    const { data: trade } = await admin
      .from("competition_trades")
      .select("*, competition_participants!inner(id, user_id, cash)")
      .eq("id", data.tradeId)
      .maybeSingle();
    if (!trade) fail("Trade not found.");
    const participant = (trade as Record<string, unknown>)["competition_participants"] as Record<string, unknown>;
    if (String(participant["user_id"]) !== context.userId) fail("You cannot close this trade.");
    if (String(trade.status) !== "OPEN") fail("This trade is already closed.");

    const { getMarketDataProvider } = await import("./market/provider.server");
    let exit: number;
    try {
      exit = Number((await getMarketDataProvider().getLatestPrice(String(trade.symbol))).price);
    } catch {
      fail("Live market data is unavailable right now. Please try again shortly.");
    }
    if (!Number.isFinite(exit) || exit <= 0) fail("Live market data is unavailable right now.");

    const pnl = pnlFor(
      trade.direction as "BUY" | "SELL",
      Number(trade.entry_price),
      exit,
      Number(trade.position_size),
    );

    await admin
      .from("competition_trades")
      .update({
        exit_price: exit,
        current_price: exit,
        pnl,
        unrealized_pnl: 0,
        status: "CLOSED",
        closed_at: new Date().toISOString(),
      })
      .eq("id", data.tradeId);

    await admin
      .from("competition_participants")
      .update({ cash: Math.round((Number(participant["cash"]) + pnl) * 100) / 100 })
      .eq("id", String(participant["id"]));

    return { pnl, exit };
  });

/* ------------------------------------------------------------------ */
/* Social leaderboards & privacy                                       */
/* ------------------------------------------------------------------ */

export const getSocialLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { country?: string | null; page?: number }) => ({
    country: data?.country ? String(data.country) : null,
    page: Math.max(0, Math.min(20, Number(data?.page ?? 0) || 0)),
  }))
  .handler(async ({ data, context }) => {
    const pageSize = 25;
    const args = { _limit: pageSize, _offset: data.page * pageSize };
    const { data: rows, error } = await context.supabase.rpc(
      "get_social_leaderboard",
      data.country ? { ...args, _country: data.country } : args,
    );
    if (error) fail("Could not load the leaderboard right now.");
    return {
      me: context.userId,
      page: data.page,
      pageSize,
      rows: (rows ?? []).map((r, i) => ({ ...r, rank: data.page * pageSize + i + 1 })),
    };
  });

export const updateSocialPrivacy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    country?: string | null;
    showCountry?: boolean;
    isPublicProfile?: boolean;
    isLeaderboardVisible?: boolean;
  }) => {
    const country = data?.country ? String(data.country) : null;
    if (country && !COUNTRIES.includes(country as (typeof COUNTRIES)[number])) fail("Choose a country from the list.");
    return {
      country,
      showCountry: Boolean(data?.showCountry),
      isPublicProfile: Boolean(data?.isPublicProfile),
      isLeaderboardVisible: Boolean(data?.isLeaderboardVisible),
    };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        country: data.country,
        show_country: data.showCountry,
        is_public_profile: data.isPublicProfile,
        is_leaderboard_visible: data.isLeaderboardVisible,
      })
      .eq("id", context.userId);
    if (error) fail("Could not save your privacy settings.");
    return { ok: true };
  });
