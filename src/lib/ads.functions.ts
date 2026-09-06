import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  AD_FLAGS,
  AD_LIMITS,
  INTERSTITIAL_PLACEMENTS,
  REWARDED_PLACEMENTS,
  REWARD_BY_PLACEMENT,
  type InterstitialPlacement,
  type RewardedPlacement,
} from "./ads/config";

/**
 * Version 2.0 — server-authoritative advertising limits and rewards.
 *
 * The frontend can never grant itself a reward: it asks the server to open a
 * reward opportunity (one-time nonce), shows a genuine Google Mobile Ads
 * rewarded ad, and only a completed SDK reward callback lets it redeem the
 * nonce. The nonce can be redeemed exactly once, daily caps live in the
 * database, and clearing local storage or reinstalling changes nothing.
 */

export class AdError extends Error {}

const GRANT_TTL_MS = 15 * 60 * 1000;

function utcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type Activity = {
  rewarded_ads_completed: number;
  interstitial_ads_shown: number;
  ai_coach_rewards: number;
  career_rewards: number;
  arena_rewards: number;
  bonus_ai_analyses: number;
  last_interstitial_at: string | null;
};

const EMPTY: Activity = {
  rewarded_ads_completed: 0,
  interstitial_ads_shown: 0,
  ai_coach_rewards: 0,
  career_rewards: 0,
  arena_rewards: 0,
  bonus_ai_analyses: 0,
  last_interstitial_at: null,
};

type Admin = Awaited<ReturnType<typeof admin>>;

async function todayActivity(db: Admin, userId: string): Promise<Activity> {
  const { data } = await db
    .from("user_ad_activity")
    .select("*")
    .eq("user_id", userId)
    .eq("activity_date", utcDate())
    .maybeSingle();
  if (!data) return { ...EMPTY };
  return {
    rewarded_ads_completed: Number(data["rewarded_ads_completed"] ?? 0),
    interstitial_ads_shown: Number(data["interstitial_ads_shown"] ?? 0),
    ai_coach_rewards: Number(data["ai_coach_rewards"] ?? 0),
    career_rewards: Number(data["career_rewards"] ?? 0),
    arena_rewards: Number(data["arena_rewards"] ?? 0),
    bonus_ai_analyses: Number(data["bonus_ai_analyses"] ?? 0),
    last_interstitial_at: (data["last_interstitial_at"] as string | null) ?? null,
  };
}

async function saveActivity(db: Admin, userId: string, patch: Partial<Activity>) {
  const current = await todayActivity(db, userId);
  await db.from("user_ad_activity").upsert(
    {
      user_id: userId,
      activity_date: utcDate(),
      ...current,
      ...patch,
    },
    { onConflict: "user_id,activity_date" },
  );
}

function placementCount(a: Activity, placement: RewardedPlacement): number {
  if (placement === "AI_COACH") return a.ai_coach_rewards;
  if (placement === "CAREER") return a.career_rewards;
  return a.arena_rewards;
}

function placementCap(placement: RewardedPlacement): number {
  if (placement === "AI_COACH") return AD_LIMITS.AI_COACH_REWARDED_PER_DAY;
  if (placement === "CAREER") return AD_LIMITS.CAREER_REWARDED_PER_DAY;
  return AD_LIMITS.ARENA_REWARDED_PER_DAY;
}

function rewardedAllowed(a: Activity, placement: RewardedPlacement): boolean {
  if (!AD_FLAGS.ADS_ENABLED || !AD_FLAGS.REWARDED_ADS_ENABLED) return false;
  if (a.rewarded_ads_completed + a.interstitial_ads_shown >= AD_LIMITS.TOTAL_PER_DAY) return false;
  if (a.rewarded_ads_completed >= AD_LIMITS.REWARDED_PER_DAY) return false;
  return placementCount(a, placement) < placementCap(placement);
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export const getAdStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const a = await todayActivity(db, context.userId);
    return {
      adsEnabled: AD_FLAGS.ADS_ENABLED,
      rewardedEnabled: AD_FLAGS.REWARDED_ADS_ENABLED,
      interstitialEnabled: AD_FLAGS.INTERSTITIAL_ADS_ENABLED,
      rewardedCompletedToday: a.rewarded_ads_completed,
      interstitialsShownToday: a.interstitial_ads_shown,
      bonusAiAnalyses: a.bonus_ai_analyses,
      limits: AD_LIMITS,
      available: {
        AI_COACH: rewardedAllowed(a, "AI_COACH"),
        CAREER: rewardedAllowed(a, "CAREER"),
        ARENA: rewardedAllowed(a, "ARENA"),
      } as Record<RewardedPlacement, boolean>,
    };
  });

/* ------------------------------------------------------------------ */
/* Rewarded ads — open a one-time opportunity                          */
/* ------------------------------------------------------------------ */

export const startRewardedAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { placement: RewardedPlacement }) => {
    if (!REWARDED_PLACEMENTS.includes(data?.placement)) throw new AdError("Unknown ad placement.");
    return { placement: data.placement };
  })
  .handler(async ({ data, context }) => {
    const db = await admin();
    const a = await todayActivity(db, context.userId);
    if (!rewardedAllowed(a, data.placement)) {
      throw new AdError("Daily ad reward limit reached. Please try again tomorrow.");
    }
    const reward = REWARD_BY_PLACEMENT[data.placement];
    const nonce = crypto.randomUUID();
    const { error } = await db.from("ad_reward_grants").insert({
      user_id: context.userId,
      placement: data.placement,
      nonce,
      status: "PENDING",
      reward_type: reward.type,
      reward_amount: reward.amount,
    });
    if (error) throw new AdError("Could not start the ad right now.");
    return { nonce, reward: reward.label };
  });

/* ------------------------------------------------------------------ */
/* Rewarded ads — redeem after a genuine SDK reward callback           */
/* ------------------------------------------------------------------ */

export const completeRewardedAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { nonce: string }) => {
    if (!data?.nonce) throw new AdError("Missing ad reference.");
    return { nonce: String(data.nonce) };
  })
  .handler(async ({ data, context }) => {
    const db = await admin();

    const { data: grant } = await db
      .from("ad_reward_grants")
      .select("*")
      .eq("nonce", data.nonce)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!grant) throw new AdError("Ad reward could not be verified.");
    if (grant["status"] !== "PENDING") throw new AdError("This ad reward was already granted.");
    if (Date.now() - new Date(String(grant["created_at"])).getTime() > GRANT_TTL_MS) {
      throw new AdError("This ad reward expired. Please try again.");
    }

    const placement = String(grant["placement"]) as RewardedPlacement;
    const activity = await todayActivity(db, context.userId);
    if (!rewardedAllowed(activity, placement)) {
      throw new AdError("Daily ad reward limit reached. Please try again tomorrow.");
    }

    // Single-redemption guard: only the request that flips PENDING -> COMPLETED wins.
    const { data: claimed } = await db
      .from("ad_reward_grants")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
      .eq("id", grant["id"] as string)
      .eq("status", "PENDING")
      .select("id")
      .maybeSingle();
    if (!claimed) throw new AdError("This ad reward was already granted.");

    const patch: Partial<Activity> = {
      rewarded_ads_completed: activity.rewarded_ads_completed + 1,
    };
    if (placement === "AI_COACH") {
      patch.ai_coach_rewards = activity.ai_coach_rewards + 1;
      patch.bonus_ai_analyses = activity.bonus_ai_analyses + Number(grant["reward_amount"] ?? 1);
    } else if (placement === "CAREER") {
      patch.career_rewards = activity.career_rewards + 1;
    } else {
      patch.arena_rewards = activity.arena_rewards + 1;
    }
    await saveActivity(db, context.userId, patch);

    let message = "";
    if (String(grant["reward_type"]) === "XP") {
      const { awardXp, recomputeProfile, addNotification } = await import("./engine.server");
      const amount = Number(grant["reward_amount"] ?? 0);
      await awardXp(db, context.userId, amount, `AD_BONUS_${placement}`);
      await recomputeProfile(db, context.userId);
      await addNotification(
        db,
        context.userId,
        "Optional bonus unlocked",
        `${amount} bonus XP added. Virtual only — no cash value.`,
      );
      message = `${amount} bonus XP added.`;
    } else {
      message = "1 extra AI analysis unlocked for today.";
    }

    return { granted: true, message };
  });

/* ------------------------------------------------------------------ */
/* Interstitials — server decides, client only reports what happened   */
/* ------------------------------------------------------------------ */

export const requestInterstitial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { placement: InterstitialPlacement }) => {
    if (!INTERSTITIAL_PLACEMENTS.includes(data?.placement)) throw new AdError("Unknown ad placement.");
    return { placement: data.placement };
  })
  .handler(async ({ data, context }) => {
    if (!AD_FLAGS.ADS_ENABLED || !AD_FLAGS.INTERSTITIAL_ADS_ENABLED) return { allowed: false, token: null };

    const db = await admin();
    const a = await todayActivity(db, context.userId);

    if (a.interstitial_ads_shown >= AD_LIMITS.INTERSTITIAL_PER_DAY) return { allowed: false, token: null };
    if (a.rewarded_ads_completed + a.interstitial_ads_shown >= AD_LIMITS.TOTAL_PER_DAY) {
      return { allowed: false, token: null };
    }
    if (a.last_interstitial_at) {
      const elapsed = Date.now() - new Date(a.last_interstitial_at).getTime();
      if (elapsed < AD_LIMITS.INTERSTITIAL_MIN_INTERVAL_MINUTES * 60_000) {
        return { allowed: false, token: null };
      }
    }

    // First-session protection: no interstitial before the user has actually
    // experienced the core simulator (account age + at least one trade).
    const [{ data: profile }, { count: tradeCount }] = await Promise.all([
      db.from("profiles").select("created_at").eq("id", context.userId).maybeSingle(),
      db.from("trades").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
    ]);
    const accountAgeMs = profile?.["created_at"]
      ? Date.now() - new Date(String(profile["created_at"])).getTime()
      : 0;
    if (accountAgeMs < 60 * 60 * 1000 || (tradeCount ?? 0) < 1) return { allowed: false, token: null };

    const nonce = crypto.randomUUID();
    const { error } = await db.from("ad_reward_grants").insert({
      user_id: context.userId,
      placement: data.placement,
      nonce,
      status: "PENDING",
      reward_type: "INTERSTITIAL",
      reward_amount: 0,
    });
    if (error) return { allowed: false, token: null };
    return { allowed: true, token: nonce };
  });

export const recordInterstitialShown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { token: string }) => {
    if (!data?.token) throw new AdError("Missing ad reference.");
    return { token: String(data.token) };
  })
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: claimed } = await db
      .from("ad_reward_grants")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
      .eq("nonce", data.token)
      .eq("user_id", context.userId)
      .eq("status", "PENDING")
      .select("id")
      .maybeSingle();
    if (!claimed) return { recorded: false };

    const a = await todayActivity(db, context.userId);
    await saveActivity(db, context.userId, {
      interstitial_ads_shown: a.interstitial_ads_shown + 1,
      last_interstitial_at: new Date().toISOString(),
    });
    return { recorded: true };
  });
