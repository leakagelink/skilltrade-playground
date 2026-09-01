/** Server-only paper trading engine helpers. Never imported by client code. */
import {
  XP_REWARDS,
  calculateTradingSkillScore,
  levelFromXp,
  type TradeForScoring,
} from "./gamification.server";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export function pnlFor(
  direction: "BUY" | "SELL",
  entry: number,
  exit: number,
  positionSize: number,
): number {
  const units = positionSize / entry;
  const diff = direction === "BUY" ? exit - entry : entry - exit;
  return Math.round(diff * units * 100) / 100;
}

export async function addNotification(
  admin: Admin,
  userId: string,
  title: string,
  body: string,
  kind: string,
) {
  await admin.from("notifications").insert({ user_id: userId, title, body, kind });
}

export async function awardXp(admin: Admin, userId: string, amount: number, reason: string) {
  if (amount <= 0) return;
  await admin.from("xp_transactions").insert({ user_id: userId, amount, reason });
}

export async function adjustCredits(
  admin: Admin,
  userId: string,
  amount: number,
  source: string,
) {
  await admin.from("credit_transactions").insert({
    user_id: userId,
    transaction_type: amount >= 0 ? "CREDIT" : "DEBIT",
    amount: Math.abs(amount),
    source,
  });
}

/** Recomputes XP total, level, skill score and badges from source-of-truth rows. */
export async function recomputeProfile(admin: Admin, userId: string) {
  const [{ data: xpRows }, { data: tradeRows }, { data: profile }] = await Promise.all([
    admin.from("xp_transactions").select("amount").eq("user_id", userId),
    admin
      .from("trades")
      .select("direction, entry_price, exit_price, position_size, stop_loss, take_profit, realized_pnl, status")
      .eq("user_id", userId)
      .order("closed_at", { ascending: true }),
    admin.from("profiles").select("level, xp").eq("id", userId).single(),
  ]);

  const totalXp = (xpRows ?? []).reduce((a, r) => a + (r.amount as number), 0);
  const level = levelFromXp(totalXp);
  const trades = (tradeRows ?? []).map((t) => ({
    ...t,
    entry_price: Number(t.entry_price),
    exit_price: t.exit_price == null ? null : Number(t.exit_price),
    position_size: Number(t.position_size),
    stop_loss: t.stop_loss == null ? null : Number(t.stop_loss),
    take_profit: t.take_profit == null ? null : Number(t.take_profit),
    realized_pnl: t.realized_pnl == null ? null : Number(t.realized_pnl),
  })) as TradeForScoring[];

  const breakdown = calculateTradingSkillScore(trades);

  await admin
    .from("profiles")
    .update({ xp: totalXp, level, trading_skill_score: breakdown.score })
    .eq("id", userId);

  if (profile && level > (profile.level as number)) {
    await addNotification(admin, userId, "Level up!", `You reached level ${level}.`, "LEVEL_UP");
  }

  await evaluateBadges(admin, userId, trades, breakdown.score);
  return { totalXp, level, score: breakdown.score };
}

async function grantBadge(admin: Admin, userId: string, code: string) {
  const { data: badge } = await admin.from("badges").select("id, name").eq("code", code).maybeSingle();
  if (!badge) return;
  const { data: existing } = await admin
    .from("user_badges")
    .select("id")
    .eq("user_id", userId)
    .eq("badge_id", badge.id)
    .maybeSingle();
  if (existing) return;
  await admin.from("user_badges").insert({ user_id: userId, badge_id: badge.id });
  await addNotification(admin, userId, "Badge earned", `You earned "${badge.name}".`, "BADGE");
}

async function evaluateBadges(admin: Admin, userId: string, trades: TradeForScoring[], score: number) {
  const closed = trades.filter((t) => t.status !== "OPEN");
  if (trades.length >= 1) await grantBadge(admin, userId, "first_trade");
  if (closed.length >= 10) await grantBadge(admin, userId, "ten_trades");
  const disciplined = closed.filter((t) => t.stop_loss != null && t.take_profit != null);
  if (disciplined.length >= 5) await grantBadge(admin, userId, "disciplined_trader");
  const lowRisk = closed.filter(
    (t) =>
      t.stop_loss != null &&
      (Math.abs(t.entry_price - t.stop_loss) / t.entry_price) * t.position_size < 100000 * 0.05,
  );
  if (lowRisk.length >= 10) await grantBadge(admin, userId, "risk_manager");
  if (score >= 600) await grantBadge(admin, userId, "consistent_trader");
}

function periodKey(type: "DAILY" | "WEEKLY"): string {
  const now = new Date();
  if (type === "DAILY") return now.toISOString().slice(0, 10);
  const first = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((now.getTime() - first.getTime()) / 86400000 + first.getUTCDay() + 1) / 7);
  return `${now.getUTCFullYear()}-W${week}`;
}

function since(type: "DAILY" | "WEEKLY"): string {
  const ms = type === "DAILY" ? 86400000 : 7 * 86400000;
  return new Date(Date.now() - ms).toISOString();
}

/** Recomputes challenge progress from trade rows and grants rewards once. */
export async function evaluateChallenges(admin: Admin, userId: string) {
  const { data: challenges } = await admin.from("challenges").select("*").eq("is_active", true);
  if (!challenges) return;

  for (const c of challenges) {
    const type = c.challenge_type as "DAILY" | "WEEKLY";
    const key = periodKey(type);
    const { data: rows } = await admin
      .from("trades")
      .select("stop_loss, take_profit, entry_price, status, opened_at, closed_at")
      .eq("user_id", userId)
      .gte("opened_at", since(type));
    const trades = rows ?? [];
    const closedTrades = trades.filter((t) => t.status !== "OPEN");

    let progress = 0;
    switch (c.metric) {
      case "closed_trades_today":
      case "closed_trades_week":
        progress = closedTrades.length;
        break;
      case "sl_trades_today":
        progress = trades.filter((t) => t.stop_loss != null).length;
        break;
      case "disciplined_trades_today":
      case "disciplined_trades_week":
        progress = closedTrades.filter((t) => t.stop_loss != null && t.take_profit != null).length;
        break;
      case "good_rr_trades_week":
        progress = closedTrades.filter((t) => {
          if (t.stop_loss == null || t.take_profit == null) return false;
          const risk = Math.abs(Number(t.entry_price) - Number(t.stop_loss));
          const reward = Math.abs(Number(t.take_profit) - Number(t.entry_price));
          return risk > 0 && reward / risk >= 1.5;
        }).length;
        break;
      default:
        progress = 0;
    }

    const target = Number(c.target);
    const completed = progress >= target;

    const { data: existing } = await admin
      .from("user_challenges")
      .select("id, status")
      .eq("user_id", userId)
      .eq("challenge_id", c.id)
      .eq("period_key", key)
      .maybeSingle();

    if (!existing) {
      await admin.from("user_challenges").insert({
        user_id: userId,
        challenge_id: c.id,
        period_key: key,
        progress,
        status: completed ? "COMPLETED" : "IN_PROGRESS",
        completed_at: completed ? new Date().toISOString() : null,
      });
      if (completed) await payChallengeReward(admin, userId, c);
    } else if (existing.status !== "COMPLETED") {
      await admin
        .from("user_challenges")
        .update({
          progress,
          status: completed ? "COMPLETED" : "IN_PROGRESS",
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", existing.id);
      if (completed) await payChallengeReward(admin, userId, c);
    }
  }
}

async function payChallengeReward(
  admin: Admin,
  userId: string,
  c: { title: string; reward_xp: number; reward_credits: number },
) {
  await awardXp(admin, userId, c.reward_xp || XP_REWARDS.CHALLENGE_COMPLETE, `CHALLENGE:${c.title}`);
  if (c.reward_credits > 0) {
    const { data: p } = await admin.from("profiles").select("virtual_credits").eq("id", userId).single();
    await admin
      .from("profiles")
      .update({ virtual_credits: (p?.virtual_credits ?? 0) + c.reward_credits })
      .eq("id", userId);
    await adjustCredits(admin, userId, c.reward_credits, "CHALLENGE_REWARD");
  }
  await grantBadge(admin, userId, "challenge_winner");
  await addNotification(admin, userId, "Challenge completed", c.title, "CHALLENGE");
}
