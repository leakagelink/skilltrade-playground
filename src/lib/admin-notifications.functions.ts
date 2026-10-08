import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { admin: !error && data === true };
  });

export const getBroadcastStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || data !== true) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ count: deviceCount }, { count: userCount }] = await Promise.all([
      supabaseAdmin.from("push_tokens").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    ]);
    return { devices: deviceCount ?? 0, users: userCount ?? 0 };
  });

export type AdminUserRow = {
  user_id: string;
  email: string | null;
  username: string;
  full_name: string | null;
  mobile: string | null;
  experience_level: string | null;
  learning_goal: string | null;
  preferred_markets: string[] | null;
  capital_range: string | null;
  level: number;
  xp: number;
  created_at: string | null;
};

export const getAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRow[]> => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || isAdmin !== true) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles }, { data: pers }, { data: mobiles }, { data: authList }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, username, level, xp, created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("user_personalization").select("user_id, full_name, mobile, experience_level, learning_goal, preferred_markets, hypothetical_starting_capital_range"),
      supabaseAdmin.from("user_mobiles").select("user_id, mobile"),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    const emailById = new Map((authList?.users ?? []).map((u) => [u.id, u.email ?? null]));
    const persById = new Map((pers ?? []).map((p) => [p.user_id, p]));
    const mobileById = new Map((mobiles ?? []).map((m) => [m.user_id, m.mobile]));

    return (profiles ?? []).map((p) => {
      const pe = persById.get(p.id);
      return {
        user_id: p.id,
        email: emailById.get(p.id) ?? null,
        username: p.username,
        full_name: pe?.full_name ?? null,
        mobile: mobileById.get(p.id) ?? pe?.mobile ?? null,
        experience_level: pe?.experience_level ?? null,
        learning_goal: pe?.learning_goal ?? null,
        preferred_markets: pe?.preferred_markets ?? null,
        capital_range: pe?.hypothetical_starting_capital_range ?? null,
        level: p.level,
        xp: p.xp,
        created_at: p.created_at,
      };
    });
  });

const messageSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
});

export const sendAdminTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => messageSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || isAdmin !== true) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPushToUser } = await import("./push.server");
    const result = await sendPushToUser(supabaseAdmin, context.userId, data.title, data.body, "ADMIN_TEST");
    if (result.sent > 0) {
      await supabaseAdmin.from("notifications").insert({
        user_id: context.userId,
        title: data.title,
        body: data.body,
        kind: "ADMIN_TEST",
      });
    }
    return result;
  });

export const broadcastPushAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => messageSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || isAdmin !== true) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { broadcastPushToAll } = await import("./push.server");
    const result = await broadcastPushToAll(supabaseAdmin, data.title, data.body, "ADMIN_BROADCAST");
    // In-app copy for every user, regardless of whether any push delivery succeeded.
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
    if (profiles?.length) {
      await supabaseAdmin.from("notifications").insert(
        profiles.map((p) => ({ user_id: p.id, title: data.title, body: data.body, kind: "ADMIN_BROADCAST" })),
      );
    }
    return result;
  });
