import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const getAgentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getUsage, isUnlocked } = await import("./ai-agent.server");
    const u = await getUsage(await admin(), context.userId);
    return {
      freeAvailable: !u.free_used,
      unlocked: isUnlocked(u),
      unlockedUntil: u.unlocked_until,
      unlockAds: u.unlock_ads,
    };
  });

type Msg = { role: "user" | "assistant"; content: string };

export const askAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { question: string; history?: Msg[] }) => {
    const question = String(d?.question ?? "").trim();
    if (question.length < 2) throw new Error("Please type a question.");
    if (question.length > 500) throw new Error("Please keep your question under 500 characters.");
    const history = Array.isArray(d?.history)
      ? d.history
          .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-4)
      : [];
    return { question, history };
  })
  .handler(async ({ data, context }) => {
    const s = await import("./ai-agent.server");
    const db = await admin();
    const u = await s.getUsage(db, context.userId);
    const unlocked = s.isUnlocked(u);
    if (u.questions_asked >= s.DAILY_HARD_CAP) throw new Error("Daily AI Agent limit reached. Please come back tomorrow.");
    if (!unlocked && u.free_used) throw new Error("LOCKED");
    const answer = await s.askRelay(data.history, data.question);
    // Only count a question after a successful answer, so failures never cost the free question.
    await s.recordQuestion(db, context.userId, !unlocked);
    return { answer };
  });

export const reportAgentAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { question: string; answer: string; reason?: string }) => ({
    question: String(d?.question ?? "").slice(0, 600),
    answer: String(d?.answer ?? "").slice(0, 3000),
    reason: d?.reason ? String(d.reason).slice(0, 300) : null,
  }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    await db.from("ai_agent_reports").insert({ user_id: context.userId, ...data });
    return { ok: true };
  });
