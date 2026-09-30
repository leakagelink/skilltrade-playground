import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const registerPushToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ token: z.string().min(20).max(4096), platform: z.enum(["android", "ios", "web"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // A device token belongs to whoever is signed in on that device now.
    const { error } = await supabaseAdmin
      .from("push_tokens")
      .upsert(
        { token: data.token, user_id: context.userId, platform: data.platform, updated_at: new Date().toISOString() },
        { onConflict: "token" },
      );
    if (error) throw new Error("Could not enable notifications.");
    return { ok: true };
  });

export const unregisterPushTokens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("push_tokens").delete().eq("user_id", context.userId);
    return { ok: true };
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPushToUser } = await import("./push.server");
    await sendPushToUser(
      supabaseAdmin,
      context.userId,
      "TradeVirt Test",
      "Push notifications kaam kar rahi hain! 🎉",
      "TEST",
    );
    return { ok: true };
  });

export const getPushStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await context.supabase
      .from("push_tokens")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId);
    return { devices: count ?? 0 };
  });
