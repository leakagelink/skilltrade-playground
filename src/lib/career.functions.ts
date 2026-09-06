import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Version 1.3 Career Mode server functions.
 *
 * Identity always comes from the authenticated session — never from the client.
 * Stage unlocks, mission completion and rewards are computed and written here.
 */

export class CareerError extends Error {}

async function deps() {
  const [{ supabaseAdmin }, engine] = await Promise.all([
    import("@/integrations/supabase/client.server"),
    import("./career/engine.server"),
  ]);
  return { admin: supabaseAdmin, ...engine };
}

export const getCareerStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin, evaluateCareerProgress, syncProfileAfterCareer } = await deps();
    const status = await evaluateCareerProgress(admin, context.userId);
    await syncProfileAfterCareer(admin, context.userId);
    return status;
  });

/** Selecting a learning path is cosmetic and only allowed for unlocked paths. */
export const selectSpecialization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { specialization: string }) => {
    if (!data || typeof data.specialization !== "string" || data.specialization.length > 40) {
      throw new CareerError("Invalid learning path.");
    }
    return { specialization: data.specialization };
  })
  .handler(async ({ context, data }) => {
    const { admin, evaluateCareerProgress } = await deps();
    const status = await evaluateCareerProgress(admin, context.userId);
    if (!status.unlockedSpecializations.includes(data.specialization)) {
      throw new CareerError("This learning path is not unlocked yet.");
    }
    await admin
      .from("career_progress")
      .update({ specialization: data.specialization, updated_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    return { ...status, specialization: data.specialization, specializations: status.specializations.map((s) => ({ ...s, selected: s.key === data.specialization })) };
  });
