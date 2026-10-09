import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ActivityReport = {
  generated_at: string;
  timezone: string;
  period_start: string;
  tracking_started_at: string | null;
  total_users: number;
  periods: { period: string; signups: number; active_users: number }[];
  active_users: { user_id: string; username: string; full_name: string | null; country: string | null; last_seen_at: string; platforms: string[] }[];
  countries: { country: string; users: number }[];
  trend: { date: string; signups: number; active_users: number }[];
};

export const recordActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ platform: z.enum(["web", "android", "ios"]) }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("record_user_activity", { _platform: data.platform });
    if (error) throw new Error("Activity could not be recorded");
    return { ok: true };
  });

export const getActivityReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ period: z.enum(["day", "week", "month", "year"]) }).parse(input))
  .handler(async ({ context, data }): Promise<ActivityReport> => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || admin !== true) throw new Error("Forbidden");
    const { data: report, error } = await context.supabase.rpc("get_admin_activity_report", { _period: data.period });
    if (error || !report) throw new Error("Activity report could not be loaded");
    return report as unknown as ActivityReport;
  });