import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getUserTier } from "./billing.functions";
import { canUsePracticeTool, disciplineAudit, riskPlan, stressPlan } from "./billing/practice-benefits";

const input = z.discriminatedUnion("tool", [
  z.object({ tool: z.literal("risk"), balance: z.number().finite().positive().max(1e9), riskPct: z.number().finite().positive().max(10), entry: z.number().finite().positive().max(1e9), stop: z.number().finite().positive().max(1e9), target: z.number().finite().positive().max(1e9) }),
  z.object({ tool: z.literal("audit") }),
  z.object({ tool: z.literal("stress"), balance: z.number().finite().positive().max(1e9), riskPct: z.number().finite().positive().max(10), losses: z.number().int().min(1).max(50) }),
]);

export const runPaidPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data, context }) => {
    // Check current verified, unexpired entitlement on EVERY execution. No client tier input.
    const tier = await getUserTier(context.userId);
    if (!canUsePracticeTool(tier, data.tool)) throw new Error("An active eligible subscription is required for this tool.");
    if (data.tool === "risk") return riskPlan(data.balance, data.riskPct, data.entry, data.stop, data.target);
    if (data.tool === "stress") return stressPlan(data.balance, data.riskPct, data.losses);
    const { data: trades, error } = await context.supabase.from("trades")
      .select("symbol,realized_pnl,stop_loss,take_profit,entry_price,position_size,opened_at,closed_at")
      .eq("user_id", context.userId).neq("status", "OPEN").not("closed_at", "is", null)
      .order("closed_at", { ascending: false }).limit(500);
    if (error) throw new Error("Your trade report could not load. Please retry.");
    return disciplineAudit(trades ?? []);
  });