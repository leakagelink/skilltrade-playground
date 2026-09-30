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
    // In-app copy for every user, regardless of whether they have a registered device.
    if (result.sent > 0) {
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
      if (profiles?.length) {
        await supabaseAdmin.from("notifications").insert(
          profiles.map((p) => ({ user_id: p.id, title: data.title, body: data.body, kind: "ADMIN_BROADCAST" })),
        );
      }
    }
    return result;
  });
