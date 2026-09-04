import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DAILY_REWARD_CREDITS = 3;
const REWARDED_AD_CREDITS = 1;

export class AppError extends Error {}

function fail(message: string): never {
  throw new AppError(message);
}

async function loadEngine() {
  const [{ supabaseAdmin }, engine, gam] = await Promise.all([
    import("@/integrations/supabase/client.server"),
    import("./engine.server"),
    import("./gamification.server"),
  ]);
  return { admin: supabaseAdmin, ...engine, ...gam };
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: trades }, { data: reward }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("trades").select("*").eq("user_id", userId).order("opened_at", { ascending: false }),
      supabase
        .from("daily_rewards")
        .select("next_claim_at")
        .eq("user_id", userId)
        .order("claimed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const { levelFromXp, xpForLevel, levelTitle, maxDrawdown } = await import("./gamification.server");

    const all = trades ?? [];
    const closed = all.filter((t) => t.status !== "OPEN");
    const wins = closed.filter((t) => Number(t.realized_pnl ?? 0) > 0).length;
    const totalPnl = closed.reduce((a, t) => a + Number(t.realized_pnl ?? 0), 0);
    const level = profile ? Number(profile.level) : 1;
    const xp = profile ? Number(profile.xp) : 0;

    return {
      profile: profile
        ? {
            username: profile.username as string,
            avatarUrl: profile.avatar_url as string | null,
            level,
            levelTitle: levelTitle(level),
            xp,
            xpFloor: xpForLevel(level),
            xpCeiling: xpForLevel(level + 1),
            skillScore: Number(profile.trading_skill_score),
            virtualBalance: Number(profile.virtual_balance),
            virtualCredits: Number(profile.virtual_credits),
            leaderboardVisible: profile.is_leaderboard_visible as boolean,
            onboardingCompleted: profile.onboarding_completed as boolean,
          }
        : null,
      stats: {
        totalTrades: all.length,
        openTrades: all.filter((t) => t.status === "OPEN").length,
        closedTrades: closed.length,
        wins,
        losses: closed.length - wins,
        winRate: closed.length ? Math.round((wins / closed.length) * 1000) / 10 : 0,
        totalPnl: Math.round(totalPnl * 100) / 100,
        maxDrawdown: maxDrawdown(
          closed.map((t) => ({
            direction: t.direction as "BUY" | "SELL",
            entry_price: Number(t.entry_price),
            exit_price: t.exit_price == null ? null : Number(t.exit_price),
            position_size: Number(t.position_size),
            stop_loss: t.stop_loss == null ? null : Number(t.stop_loss),
            take_profit: t.take_profit == null ? null : Number(t.take_profit),
            realized_pnl: t.realized_pnl == null ? null : Number(t.realized_pnl),
            status: t.status as string,
          })),
        ),
      },
      levelFromXpCheck: levelFromXp(xp),
      dailyReward: {
        nextClaimAt: (reward?.next_claim_at as string | null) ?? null,
        canClaim: !reward || new Date(reward.next_claim_at as string).getTime() <= Date.now(),
        amount: DAILY_REWARD_CREDITS,
      },
    };
  });

/* ------------------------------------------------------------------ */
/* Trades                                                              */
/* ------------------------------------------------------------------ */

export const getTrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("trades")
      .select("*")
      .eq("user_id", context.userId)
      .order("opened_at", { ascending: false });
    return { trades: data ?? [] };
  });

export const openTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    symbol: string;
    direction: "BUY" | "SELL";
    positionSize: number;
    stopLoss?: number | null;
    takeProfit?: number | null;
    notes?: string | null;
  }) => {
    if (!data.symbol) fail("Please choose an asset.");
    if (data.direction !== "BUY" && data.direction !== "SELL") fail("Invalid trade direction.");
    const size = Number(data.positionSize);
    if (!Number.isFinite(size) || size <= 0) fail("Enter a valid position size.");
    return {
      symbol: String(data.symbol).toUpperCase(),
      direction: data.direction,
      positionSize: Math.round(size * 100) / 100,
      stopLoss: data.stopLoss == null || data.stopLoss === 0 ? null : Number(data.stopLoss),
      takeProfit: data.takeProfit == null || data.takeProfit === 0 ? null : Number(data.takeProfit),
      notes: data.notes ? String(data.notes).slice(0, 500) : null,
    };
  })
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { admin, adjustCredits, awardXp, recomputeProfile, evaluateChallenges, XP_REWARDS } =
      await loadEngine();
    const { getMarketDataProvider } = await import("./market/provider.server");

    const { data: profile } = await admin
      .from("profiles")
      .select("virtual_credits, virtual_balance")
      .eq("id", userId)
      .single();
    if (!profile) fail("Profile not found.");

    if (Number(profile.virtual_credits) < 1) fail("You need Trading Credits to open a new trade.");

    const { data: asset } = await admin
      .from("assets")
      .select("id, symbol, asset_type")
      .eq("symbol", data.symbol)
      .eq("is_active", true)
      .maybeSingle();
    if (!asset) fail("This asset is not available for simulated trading.");

    // Exposure limit: total open position size must stay within virtual balance.
    const { data: openTrades } = await admin
      .from("trades")
      .select("position_size")
      .eq("user_id", userId)
      .eq("status", "OPEN");
    const exposure = (openTrades ?? []).reduce((a, t) => a + Number(t.position_size), 0);
    if (exposure + data.positionSize > Number(profile.virtual_balance)) {
      fail("Position size exceeds your available virtual balance.");
    }

    let quote;
    try {
      quote = await getMarketDataProvider().getLatestPrice(data.symbol);
    } catch {
      fail("Market data is temporarily unavailable. Please try again later.");
    }
    const entry = quote.price;

    if (data.stopLoss != null) {
      if (data.direction === "BUY" && data.stopLoss >= entry) fail("Stop loss must be below the entry price for a BUY.");
      if (data.direction === "SELL" && data.stopLoss <= entry) fail("Stop loss must be above the entry price for a SELL.");
    }
    if (data.takeProfit != null) {
      if (data.direction === "BUY" && data.takeProfit <= entry) fail("Take profit must be above the entry price for a BUY.");
      if (data.direction === "SELL" && data.takeProfit >= entry) fail("Take profit must be below the entry price for a SELL.");
    }

    const { data: trade, error } = await admin
      .from("trades")
      .insert({
        user_id: userId,
        asset_id: asset.id,
        symbol: asset.symbol,
        asset_type: asset.asset_type,
        direction: data.direction,
        entry_price: entry,
        current_price: entry,
        position_size: data.positionSize,
        stop_loss: data.stopLoss,
        take_profit: data.takeProfit,
        notes: data.notes,
        unrealized_pnl: 0,
      })
      .select("id")
      .single();
    if (error || !trade) fail("Unable to open this simulated trade. Please check your trading parameters.");

    await admin
      .from("profiles")
      .update({ virtual_credits: Number(profile.virtual_credits) - 1 })
      .eq("id", userId);
    await adjustCredits(admin, userId, -1, "TRADE_COST");
    await awardXp(admin, userId, XP_REWARDS.OPEN_TRADE, "OPEN_TRADE");
    await recomputeProfile(admin, userId);
    await evaluateChallenges(admin, userId);

    return { tradeId: trade.id as string, entryPrice: entry };
  });

export const closeTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tradeId: string }) => {
    if (!data?.tradeId) fail("Missing trade.");
    return { tradeId: String(data.tradeId) };
  })
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const {
      admin,
      pnlFor,
      awardXp,
      recomputeProfile,
      evaluateChallenges,
      addNotification,
      XP_REWARDS,
    } = await loadEngine();
    const { getMarketDataProvider } = await import("./market/provider.server");
    const { getTradeAnalysisService } = await import("./trade-review.server");

    const { data: trade } = await admin
      .from("trades")
      .select("*")
      .eq("id", data.tradeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!trade) fail("Trade not found.");
    if (trade.status !== "OPEN") fail("This trade is already closed.");

    let quote;
    try {
      quote = await getMarketDataProvider().getLatestPrice(trade.symbol as string);
    } catch {
      fail("Market data is temporarily unavailable. Please try again later.");
    }

    const direction = trade.direction as "BUY" | "SELL";
    const entry = Number(trade.entry_price);
    const size = Number(trade.position_size);
    const sl = trade.stop_loss == null ? null : Number(trade.stop_loss);
    const tp = trade.take_profit == null ? null : Number(trade.take_profit);

    let exit = quote.price;
    let status: "CLOSED" | "STOP_LOSS_HIT" | "TAKE_PROFIT_HIT" = "CLOSED";
    if (sl != null && ((direction === "BUY" && exit <= sl) || (direction === "SELL" && exit >= sl))) {
      exit = sl;
      status = "STOP_LOSS_HIT";
    } else if (tp != null && ((direction === "BUY" && exit >= tp) || (direction === "SELL" && exit <= tp))) {
      exit = tp;
      status = "TAKE_PROFIT_HIT";
    }

    const pnl = pnlFor(direction, entry, exit, size);

    const { data: profile } = await admin
      .from("profiles")
      .select("virtual_balance")
      .eq("id", userId)
      .single();
    const newBalance = Math.round((Number(profile?.virtual_balance ?? 0) + pnl) * 100) / 100;

    const review = await getTradeAnalysisService().review({
      direction,
      entryPrice: entry,
      exitPrice: exit,
      positionSize: size,
      stopLoss: sl,
      takeProfit: tp,
      realizedPnl: pnl,
      virtualBalance: Number(profile?.virtual_balance ?? 100000),
    });

    await admin
      .from("trades")
      .update({
        exit_price: exit,
        current_price: exit,
        realized_pnl: pnl,
        unrealized_pnl: 0,
        status,
        closed_at: new Date().toISOString(),
        review: review.join("\n"),
      })
      .eq("id", trade.id);

    await admin.from("profiles").update({ virtual_balance: newBalance }).eq("id", userId);

    await awardXp(admin, userId, XP_REWARDS.CLOSE_TRADE, "CLOSE_TRADE");
    if (sl != null && tp != null) {
      await awardXp(admin, userId, XP_REWARDS.DISCIPLINED_TRADE, "DISCIPLINED_TRADE");
      if (pnl > 0) {
        await awardXp(admin, userId, XP_REWARDS.PROFITABLE_DISCIPLINED_TRADE, "PROFITABLE_DISCIPLINED_TRADE");
      }
    }
    await addNotification(
      admin,
      userId,
      "Trade closed",
      `${trade.symbol} ${direction} closed with a simulated P&L of ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}.`,
      "TRADE",
    );
    await recomputeProfile(admin, userId);
    await evaluateChallenges(admin, userId);

    return { exitPrice: exit, pnl, status, review };
  });

/** Marks-to-market open trades on real prices and auto-closes any that hit SL/TP. */
export const syncOpenTrades = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { admin, pnlFor, awardXp, recomputeProfile, evaluateChallenges, addNotification, XP_REWARDS } =
      await loadEngine();
    const { getMarketDataProvider } = await import("./market/provider.server");
    const provider = getMarketDataProvider();

    const { data: open } = await admin.from("trades").select("*").eq("user_id", userId).eq("status", "OPEN");
    const { data: baseProfile } = await admin
      .from("profiles")
      .select("virtual_balance")
      .eq("id", userId)
      .single();
    let balance = Number(baseProfile?.virtual_balance ?? 0);

    if (!open?.length) {
      return { updated: 0, closed: 0, openPnl: 0, equity: Math.round(balance * 100) / 100, positions: [] as Array<{ id: string; symbol: string; direction: string; price: number; pnl: number }> };
    }

    const symbols = [...new Set(open.map((t) => t.symbol as string))];
    const settled = await Promise.allSettled(symbols.map((s) => provider.getLatestPrice(s)));
    const quotes = new Map<string, number>();
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") quotes.set(symbols[i]!, r.value.price);
    });

    const positions: Array<{ id: string; symbol: string; direction: string; price: number; pnl: number }> = [];
    let openPnl = 0;
    let closedCount = 0;

    for (const t of open) {
      const symbol = t.symbol as string;
      const direction = t.direction as "BUY" | "SELL";
      const entry = Number(t.entry_price);
      const size = Number(t.position_size);
      const sl = t.stop_loss == null ? null : Number(t.stop_loss);
      const tp = t.take_profit == null ? null : Number(t.take_profit);
      const live = quotes.get(symbol);
      const price = live ?? Number(t.current_price ?? entry);

      let hit: "STOP_LOSS_HIT" | "TAKE_PROFIT_HIT" | null = null;
      let exit = price;
      if (live != null) {
        if (sl != null && ((direction === "BUY" && price <= sl) || (direction === "SELL" && price >= sl))) {
          hit = "STOP_LOSS_HIT";
          exit = sl;
        } else if (tp != null && ((direction === "BUY" && price >= tp) || (direction === "SELL" && price <= tp))) {
          hit = "TAKE_PROFIT_HIT";
          exit = tp;
        }
      }

      if (hit) {
        const realized = pnlFor(direction, entry, exit, size);
        balance = Math.round((balance + realized) * 100) / 100;
        await admin
          .from("trades")
          .update({
            exit_price: exit,
            current_price: exit,
            realized_pnl: realized,
            unrealized_pnl: 0,
            status: hit,
            closed_at: new Date().toISOString(),
          })
          .eq("id", t.id);
        await admin.from("profiles").update({ virtual_balance: balance }).eq("id", userId);
        await awardXp(admin, userId, XP_REWARDS.CLOSE_TRADE, "CLOSE_TRADE");
        await addNotification(
          admin,
          userId,
          hit === "STOP_LOSS_HIT" ? "Stop loss hit" : "Take profit hit",
          `${symbol} ${direction} closed automatically at ${exit} with a simulated P&L of ${realized >= 0 ? "+" : ""}${realized.toFixed(2)}.`,
          "TRADE",
        );
        closedCount += 1;
        continue;
      }

      const pnl = pnlFor(direction, entry, price, size);
      openPnl += pnl;
      positions.push({ id: t.id as string, symbol, direction, price, pnl });
      if (live != null) {
        await admin.from("trades").update({ current_price: price, unrealized_pnl: pnl }).eq("id", t.id);
      }
    }

    if (closedCount > 0) {
      await recomputeProfile(admin, userId);
      await evaluateChallenges(admin, userId);
    }

    return {
      updated: positions.length,
      closed: closedCount,
      openPnl: Math.round(openPnl * 100) / 100,
      equity: Math.round((balance + openPnl) * 100) / 100,
      positions,
    };
  });


/* ------------------------------------------------------------------ */
/* Credits                                                             */
/* ------------------------------------------------------------------ */

export const claimDailyReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { admin, adjustCredits, awardXp, recomputeProfile, addNotification, XP_REWARDS } =
      await loadEngine();

    const { data: last } = await admin
      .from("daily_rewards")
      .select("next_claim_at")
      .eq("user_id", userId)
      .order("claimed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (last && new Date(last.next_claim_at as string).getTime() > Date.now()) {
      fail("Your next daily reward is not available yet.");
    }

    const now = new Date();
    await admin.from("daily_rewards").insert({
      user_id: userId,
      claimed_at: now.toISOString(),
      next_claim_at: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
    });

    const { data: profile } = await admin.from("profiles").select("virtual_credits").eq("id", userId).single();
    const credits = Number(profile?.virtual_credits ?? 0) + DAILY_REWARD_CREDITS;
    await admin.from("profiles").update({ virtual_credits: credits }).eq("id", userId);
    await adjustCredits(admin, userId, DAILY_REWARD_CREDITS, "DAILY_REWARD");
    await awardXp(admin, userId, XP_REWARDS.DAILY_REWARD, "DAILY_REWARD");
    await addNotification(admin, userId, "Daily reward claimed", `+${DAILY_REWARD_CREDITS} Trading Credits.`, "REWARD");
    await recomputeProfile(admin, userId);

    return { credits, granted: DAILY_REWARD_CREDITS };
  });

/**
 * Rewarded-ad credit grant. The client may only report an ad completion token;
 * the server decides whether it is valid. In TEST MODE the token is accepted
 * with a rate limit so the flow can be exercised before a real ad SDK exists.
 */
export const grantRewardedAdCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { completionToken: string; providerId: string }) => ({
    completionToken: String(data?.completionToken ?? ""),
    providerId: String(data?.providerId ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { admin, adjustCredits, recomputeProfile } = await loadEngine();
    const { verifyAdCompletion } = await import("./ads/verify.server");

    const verified = await verifyAdCompletion(data.providerId, data.completionToken, userId);
    if (!verified) fail("We could not verify that reward. Please try again.");

    // Rate limit: max 10 ad rewards per rolling 24h.
    const { count } = await admin
      .from("credit_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("source", "REWARDED_AD")
      .gte("created_at", new Date(Date.now() - 86400000).toISOString());
    if ((count ?? 0) >= 10) fail("You have reached today's limit for rewarded credits.");

    const { data: profile } = await admin.from("profiles").select("virtual_credits").eq("id", userId).single();
    const credits = Number(profile?.virtual_credits ?? 0) + REWARDED_AD_CREDITS;
    await admin.from("profiles").update({ virtual_credits: credits }).eq("id", userId);
    await adjustCredits(admin, userId, REWARDED_AD_CREDITS, "REWARDED_AD");
    await recomputeProfile(admin, userId);
    return { credits, granted: REWARDED_AD_CREDITS };
  });

/* ------------------------------------------------------------------ */
/* Challenges, leaderboard, profile                                    */
/* ------------------------------------------------------------------ */

export const getChallenges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin, evaluateChallenges } = await loadEngine();
    await evaluateChallenges(admin, context.userId);

    const { data: challenges } = await context.supabase
      .from("challenges")
      .select("*")
      .eq("is_active", true)
      .order("challenge_type");
    const { data: mine } = await context.supabase
      .from("user_challenges")
      .select("challenge_id, progress, status")
      .eq("user_id", context.userId);

    const byId = new Map((mine ?? []).map((m) => [m.challenge_id as string, m]));
    return {
      challenges: (challenges ?? []).map((c) => ({
        id: c.id as string,
        title: c.title as string,
        description: c.description as string,
        type: c.challenge_type as "DAILY" | "WEEKLY",
        target: Number(c.target),
        rewardXp: Number(c.reward_xp),
        rewardCredits: Number(c.reward_credits),
        progress: Number(byId.get(c.id as string)?.progress ?? 0),
        status: (byId.get(c.id as string)?.status as string) ?? "IN_PROGRESS",
      })),
    };
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { period: "DAILY" | "WEEKLY" | "ALL_TIME" }) => ({
    period: (["DAILY", "WEEKLY", "ALL_TIME"] as const).includes(data?.period) ? data.period : "ALL_TIME",
  }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("get_leaderboard", {
      _period: data.period,
      _limit: 50,
    });
    if (error) return { rows: [], me: context.userId };
    return { rows: rows ?? [], me: context.userId };
  });

export const getBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: all }, { data: mine }] = await Promise.all([
      context.supabase.from("badges").select("*").order("name"),
      context.supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", context.userId),
    ]);
    const earned = new Map((mine ?? []).map((b) => [b.badge_id as string, b.earned_at as string]));
    return {
      badges: (all ?? []).map((b) => ({
        id: b.id as string,
        name: b.name as string,
        description: b.description as string,
        icon: b.icon as string,
        earnedAt: earned.get(b.id as string) ?? null,
      })),
    };
  });

export const getNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notifications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    return { notifications: data ?? [] };
  });

export const updateProfileSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { username?: string; leaderboardVisible?: boolean; onboardingCompleted?: boolean }) => {
    const out: { username?: string; leaderboardVisible?: boolean; onboardingCompleted?: boolean } = {};
    if (data.username !== undefined) {
      const u = String(data.username).trim();
      if (u.length < 3 || u.length > 20) fail("Username must be between 3 and 20 characters.");
      if (!/^[a-zA-Z0-9_]+$/.test(u)) fail("Username can only contain letters, numbers and underscores.");
      out.username = u;
    }
    if (data.leaderboardVisible !== undefined) out.leaderboardVisible = !!data.leaderboardVisible;
    if (data.onboardingCompleted !== undefined) out.onboardingCompleted = !!data.onboardingCompleted;
    return out;
  })
  .handler(async ({ data, context }) => {
    const patch: {
      username?: string;
      is_leaderboard_visible?: boolean;
      onboarding_completed?: boolean;
    } = {};
    if (data.username !== undefined) patch.username = data.username;
    if (data.leaderboardVisible !== undefined) patch.is_leaderboard_visible = data.leaderboardVisible;
    if (data.onboardingCompleted !== undefined) patch.onboarding_completed = data.onboardingCompleted;
    if (!Object.keys(patch).length) return { ok: true };

    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) {
      fail(error.code === "23505" ? "That username is already taken." : "Could not save your settings.");
    }
    return { ok: true };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.auth.admin.deleteUser(context.userId);
    return { ok: true };
  });
