import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Version 3 social layer: public Trader Cards, follows and the seasonal
 * leaderboard.
 *
 * Privacy rules (see the V3 spec, sections 23-24):
 * - Only data from opted-in public profiles (is_public_profile) is ever
 *   returned by any function in this file.
 * - Email, mobile number, full name, Trade Journal text, hypothetical
 *   starting capital and balances are NEVER included in any response.
 * - Country is only included when the user allows it (show_country).
 */

const usernameInput = z.object({
  username: z.string().trim().min(1).max(30),
});

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* ------------------------------------------------------------------ */
/* Public Trader Card                                                  */
/* ------------------------------------------------------------------ */

export type TraderCard = {
  visible: boolean;
  username?: string;
  avatarUrl?: string | null;
  level?: number;
  xp?: number;
  skillScore?: number;
  badges?: string[];
  challengesCompleted?: number;
  tradesSimulated?: number;
  learningMode?: string | null;
  markets?: string[];
  country?: string | null;
  followers?: number;
  following?: number;
  memberSince?: string | null;
};

export const getPublicTraderCard = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => usernameInput.parse(d))
  .handler(async ({ data }): Promise<TraderCard> => {
    const admin = await adminClient();
    const uname = data.username.toLowerCase().replace(/[%_]/g, "");

    const { data: p } = await admin
      .from("profiles")
      .select(
        "id, username, avatar_url, level, xp, trading_skill_score, is_public_profile, show_country, country, created_at",
      )
      .ilike("username", uname)
      .limit(1)
      .maybeSingle();

    if (!p || !p.is_public_profile) return { visible: false };

    const [followers, following, badgeRows, challenges, trades, personal] = await Promise.all([
      admin.from("social_follows").select("id", { count: "exact", head: true }).eq("following_id", p.id),
      admin.from("social_follows").select("id", { count: "exact", head: true }).eq("follower_id", p.id),
      admin
        .from("user_badges")
        .select("badges(name)")
        .eq("user_id", p.id)
        .order("earned_at", { ascending: true })
        .limit(12),
      admin
        .from("user_challenges")
        .select("id", { count: "exact", head: true })
        .eq("user_id", p.id)
        .eq("status", "COMPLETED"),
      admin
        .from("trades")
        .select("id", { count: "exact", head: true })
        .eq("user_id", p.id)
        .neq("status", "OPEN"),
      admin
        .from("user_personalization")
        .select("active_learning_mode, preferred_markets")
        .eq("user_id", p.id)
        .maybeSingle(),
    ]);

    const badgeNames = (badgeRows.data ?? [])
      .map((b) => (b as { badges?: { name?: string } | null })["badges"]?.name)
      .filter((n): n is string => Boolean(n));

    return {
      visible: true,
      username: String(p.username),
      avatarUrl: (p.avatar_url as string | null) ?? null,
      level: Number(p.level),
      xp: Number(p.xp),
      skillScore: Number(p.trading_skill_score),
      badges: badgeNames,
      challengesCompleted: challenges.count ?? 0,
      tradesSimulated: trades.count ?? 0,
      learningMode: (personal.data?.active_learning_mode as string | null) ?? null,
      markets: (personal.data?.preferred_markets as string[] | null) ?? [],
      country: p.show_country ? ((p.country as string | null) ?? null) : null,
      followers: followers.count ?? 0,
      following: following.count ?? 0,
      memberSince: (p.created_at as string | null) ?? null,
    };
  });

/* ------------------------------------------------------------------ */
/* Follows                                                             */
/* ------------------------------------------------------------------ */

export const followUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => usernameInput.parse(d))
  .handler(async ({ data, context }) => {
    const admin = await adminClient();
    const uname = data.username.toLowerCase().replace(/[%_]/g, "");

    const { data: target } = await admin
      .from("profiles")
      .select("id, username, is_public_profile")
      .ilike("username", uname)
      .limit(1)
      .maybeSingle();

    if (!target || !target.is_public_profile) {
      throw new Error("This trader's profile is private.");
    }
    if (target.id === context.userId) {
      throw new Error("You cannot follow yourself.");
    }

    // RLS only ever inserts with follower_id = the signed-in user.
    const { error } = await context.supabase
      .from("social_follows")
      .insert({ follower_id: context.userId, following_id: target.id });

    // Following twice is not an error — it just stays followed.
    if (error && error.code !== "23505") throw new Error(error.message);

    return { following: true as const, username: String(target.username) };
  });

export const unfollowUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => usernameInput.parse(d))
  .handler(async ({ data, context }) => {
    const admin = await adminClient();
    const uname = data.username.toLowerCase().replace(/[%_]/g, "");

    const { data: target } = await admin
      .from("profiles")
      .select("id, username")
      .ilike("username", uname)
      .limit(1)
      .maybeSingle();

    if (!target) return { following: false as const };

    await context.supabase
      .from("social_follows")
      .delete()
      .eq("follower_id", context.userId)
      .eq("following_id", target.id);

    return { following: false as const, username: String(target.username) };
  });

/** The signed-in user's follow overview: counts plus who they follow. */
export const getMySocialSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [followers, following, mine] = await Promise.all([
      context.supabase
        .from("social_follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", context.userId),
      context.supabase
        .from("social_follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", context.userId),
      context.supabase
        .from("social_follows")
        .select("following_id")
        .eq("follower_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const ids = (mine.data ?? []).map((r) => r.following_id as string);
    let usernames: string[] = [];
    if (ids.length) {
      const admin = await adminClient();
      const { data: rows } = await admin
        .from("profiles")
        .select("username, is_public_profile")
        .in("id", ids);
      usernames = (rows ?? [])
        .filter((r) => r.is_public_profile)
        .map((r) => String(r.username));
    }

    return {
      followers: followers.count ?? 0,
      following: following.count ?? 0,
      followingUsernames: usernames,
    };
  });

/* ------------------------------------------------------------------ */
/* Seasonal leaderboard                                                */
/* ------------------------------------------------------------------ */

/**
 * Season = the current calendar month (UTC). Season points come from XP
 * earned and challenges completed within the season — deliberately NOT from
 * simulated profit, to avoid rewarding reckless trading.
 */
export const getSeasonLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const { data: rows, error } = await context.supabase.rpc("get_season_leaderboard", {
      _season_start: start.toISOString(),
      _season_end: end.toISOString(),
      _limit: 50,
    });

    const seasonLabel = start.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    return { rows: error ? [] : (rows ?? []), seasonLabel, me: context.userId };
  });
