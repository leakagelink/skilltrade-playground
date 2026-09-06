/**
 * Server-only Career progression engine (Version 1.3).
 *
 * Every metric is derived from verified database rows owned by the
 * authenticated user. The client can never unlock a stage, complete a mission
 * or grant a reward — all writes happen here and are idempotent.
 */
import {
  CAREER_MISSIONS,
  CAREER_SPECIALIZATIONS,
  CAREER_STAGES,
  type CareerMetric,
  stageIndex,
} from "./config";
import { addNotification, awardXp, grantBadge, recomputeProfile } from "../engine.server";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export type CareerMetrics = Record<CareerMetric, number>;

export interface CareerRequirementStatus {
  label: string;
  metric: CareerMetric;
  target: number;
  current: number;
  done: boolean;
}

export interface CareerMissionStatus {
  key: string;
  title: string;
  description: string;
  goal: string;
  target: number;
  current: number;
  rewardXp: number;
  completed: boolean;
  completedAt: string | null;
}

export interface CareerStageStatus {
  key: string;
  name: string;
  description: string;
  title: string;
  state: "COMPLETED" | "CURRENT" | "LOCKED";
  progress: number;
  requirements: CareerRequirementStatus[];
}

export interface CareerStatus {
  hasActivity: boolean;
  metrics: CareerMetrics;
  currentStage: string;
  currentStageName: string;
  careerTitle: string;
  progressPercent: number;
  nextStage: string | null;
  stages: CareerStageStatus[];
  missions: CareerMissionStatus[];
  specialization: string | null;
  unlockedSpecializations: string[];
  specializations: {
    key: string;
    name: string;
    focus: string;
    description: string;
    unlockStage: string;
    unlocked: boolean;
    selected: boolean;
  }[];
}

/* --------------------------- metric collection --------------------------- */

export async function collectMetrics(admin: Admin, userId: string): Promise<CareerMetrics> {
  const [{ data: profile }, { data: trades }, { data: challenges }, { data: reviews }, { data: arena }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("xp, trading_skill_score, onboarding_completed")
        .eq("id", userId)
        .maybeSingle(),
      admin
        .from("trades")
        .select("symbol, status, stop_loss, take_profit, opened_at, closed_at")
        .eq("user_id", userId),
      admin.from("user_challenges").select("status").eq("user_id", userId).eq("status", "COMPLETED"),
      admin.from("ai_trade_reviews").select("id").eq("user_id", userId),
      admin.from("ai_arena_sessions").select("status, winner").eq("user_id", userId),
    ]);

  const rows = trades ?? [];
  const closed = rows.filter((t) => t.status !== "OPEN");
  const days = new Set<string>();
  for (const t of rows) {
    if (t.opened_at) days.add(String(t.opened_at).slice(0, 10));
    if (t.closed_at) days.add(String(t.closed_at).slice(0, 10));
  }
  const sessions = arena ?? [];

  return {
    closedTrades: closed.length,
    totalTrades: rows.length,
    xp: Number(profile?.xp ?? 0),
    skillScore: Number(profile?.trading_skill_score ?? 0),
    challengesCompleted: (challenges ?? []).length,
    aiReviews: (reviews ?? []).length,
    arenaCompleted: sessions.filter((s) => s.status === "COMPLETED").length,
    arenaWins: sessions.filter((s) => s.status === "COMPLETED" && s.winner === "USER").length,
    stopLossTrades: closed.filter((t) => t.stop_loss != null).length,
    disciplinedTrades: closed.filter((t) => t.stop_loss != null && t.take_profit != null).length,
    distinctSymbols: new Set(rows.map((t) => t.symbol)).size,
    activeDays: days.size,
    onboarding: profile?.onboarding_completed ? 1 : 0,
  };
}

function requirementStatus(metrics: CareerMetrics, stageKey: string): CareerRequirementStatus[] {
  const stage = CAREER_STAGES.find((s) => s.key === stageKey)!;
  return stage.requirements.map((r) => {
    const current = metrics[r.metric] ?? 0;
    return { label: r.label, metric: r.metric, target: r.target, current, done: current >= r.target };
  });
}

function stageProgress(reqs: CareerRequirementStatus[]): number {
  if (reqs.length === 0) return 100;
  const total = reqs.reduce((sum, r) => sum + Math.min(1, r.target > 0 ? r.current / r.target : 1), 0);
  return Math.round((total / reqs.length) * 100);
}

/* ------------------------------ evaluation ------------------------------- */

/** Recomputes career state from real activity and persists unlocks/rewards once. */
export async function evaluateCareerProgress(admin: Admin, userId: string): Promise<CareerStatus> {
  const metrics = await collectMetrics(admin, userId);

  const [{ data: existing }, { data: completions }, { data: unlocks }] = await Promise.all([
    admin.from("career_progress").select("*").eq("user_id", userId).maybeSingle(),
    admin.from("career_mission_completions").select("mission_key, completed_at").eq("user_id", userId),
    admin.from("career_stage_unlocks").select("stage_key").eq("user_id", userId),
  ]);

  const unlockedStages = new Set((unlocks ?? []).map((u) => u.stage_key));
  const doneMissions = new Map((completions ?? []).map((c) => [c.mission_key, c.completed_at as string]));

  /* --- missions: complete once, reward once --- */
  const missions: CareerMissionStatus[] = [];
  for (const m of CAREER_MISSIONS) {
    const current = metrics[m.metric] ?? 0;
    const already = doneMissions.has(m.key);
    let completedAt = doneMissions.get(m.key) ?? null;
    const reached = current >= m.target;

    if (reached && !already) {
      const { error } = await admin
        .from("career_mission_completions")
        .insert({ user_id: userId, mission_key: m.key, reward_xp: m.rewardXp });
      if (!error) {
        completedAt = new Date().toISOString();
        await awardXp(admin, userId, m.rewardXp, `CAREER_MISSION:${m.key}`);
        if (m.badgeCode) await grantBadge(admin, userId, m.badgeCode);
        await addNotification(
          admin,
          userId,
          "Career milestone completed",
          `${m.title} — +${m.rewardXp} XP`,
          "CAREER",
        );
      }
    }

    missions.push({
      key: m.key,
      title: m.title,
      description: m.description,
      goal: m.goal,
      target: m.target,
      current: Math.min(current, m.target),
      rewardXp: m.rewardXp,
      completed: reached || already,
      completedAt,
    });
  }

  /* --- stages: highest stage whose requirements are all met --- */
  let highest = 0;
  for (let i = 0; i < CAREER_STAGES.length; i++) {
    const reqs = requirementStatus(metrics, CAREER_STAGES[i]!.key);
    if (reqs.every((r) => r.done)) highest = i + 1;
    else break;
  }

  // Unlock (and reward) every newly reached stage exactly once.
  for (let i = 0; i < highest; i++) {
    const stage = CAREER_STAGES[i]!;
    if (unlockedStages.has(stage.key)) continue;
    const { error } = await admin
      .from("career_stage_unlocks")
      .insert({ user_id: userId, stage_key: stage.key });
    if (error) continue;
    unlockedStages.add(stage.key);
    if (stage.rewardXp > 0) await awardXp(admin, userId, stage.rewardXp, `CAREER_STAGE:${stage.key}`);
    if (stage.key === "EXPERT") await grantBadge(admin, userId, "career_expert");
    if (stage.key === "LEGEND") await grantBadge(admin, userId, "career_legend");
    await addNotification(
      admin,
      userId,
      "New career stage unlocked",
      `${stage.name} — title "${stage.title}"`,
      "CAREER",
    );
  }

  const pendingIndex = Math.min(highest, CAREER_STAGES.length - 1);
  const pendingStage = CAREER_STAGES[pendingIndex]!;
  const achievedStage = highest > 0 ? CAREER_STAGES[highest - 1]! : CAREER_STAGES[0]!;
  const currentStage = achievedStage;
  const careerTitle = highest > 0 ? achievedStage.title : CAREER_STAGES[0]!.title;

  /* --- specializations --- */
  const unlockedSpecs = CAREER_SPECIALIZATIONS.filter(
    (s) => highest >= stageIndex(s.unlockStage) + 1,
  ).map((s) => s.key);
  let selected = (existing?.specialization as string | null) ?? null;
  if (selected && !unlockedSpecs.includes(selected)) selected = null;

  await admin.from("career_progress").upsert(
    {
      user_id: userId,
      current_stage: currentStage.key,
      career_title: careerTitle,
      specialization: selected,
      unlocked_specializations: unlockedSpecs,
      career_xp: metrics.xp,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  const pendingReqs = requirementStatus(metrics, pendingStage.key);
  const stages: CareerStageStatus[] = CAREER_STAGES.map((s, i) => {
    const reqs = requirementStatus(metrics, s.key);
    const state: CareerStageStatus["state"] =
      i < highest ? "COMPLETED" : i === pendingIndex ? "CURRENT" : "LOCKED";
    return {
      key: s.key,
      name: s.name,
      description: s.description,
      title: s.title,
      state,
      progress: state === "COMPLETED" ? 100 : stageProgress(reqs),
      requirements: reqs,
    };
  });

  return {
    hasActivity: metrics.totalTrades > 0,
    metrics,
    currentStage: currentStage.key,
    currentStageName: currentStage.name,
    careerTitle,
    progressPercent: highest >= CAREER_STAGES.length ? 100 : stageProgress(pendingReqs),
    nextStage: highest >= CAREER_STAGES.length ? null : pendingStage.name,
    stages,
    missions,
    specialization: selected,
    unlockedSpecializations: unlockedSpecs,
    specializations: CAREER_SPECIALIZATIONS.map((s) => ({
      ...s,
      unlocked: unlockedSpecs.includes(s.key),
      selected: selected === s.key,
    })),
  };
}

/** Keeps XP/level/badges in sync after career rewards. */
export async function syncProfileAfterCareer(admin: Admin, userId: string) {
  await recomputeProfile(admin, userId);
}
