import { createFileRoute } from "@tanstack/react-router";

/**
 * Called twice a day by the scheduler. Sends at most one "daily reward ready"
 * reminder per user per day, only to users with a registered phone.
 * Safe to call repeatedly: duplicates are skipped and no data is returned.
 */
export const Route = createFileRoute("/api/public/notify-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        const { sendPushToUser } = await import("@/lib/push.server");

        const { data: tokens } = await admin.from("push_tokens").select("user_id").limit(5000);
        const userIds = [...new Set((tokens ?? []).map((t) => t.user_id as string))];
        if (!userIds.length) return Response.json({ ok: true });

        const now = new Date();
        const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

        for (let i = 0; i < userIds.length; i += 200) {
          const batch = userIds.slice(i, i + 200);
          const [{ data: rewards }, { data: sentToday }] = await Promise.all([
            admin.from("daily_rewards").select("user_id, next_claim_at").in("user_id", batch).order("claimed_at", { ascending: false }),
            admin.from("notifications").select("user_id").in("user_id", batch).eq("kind", "DAILY_REMINDER").gte("created_at", dayStart),
          ]);
          const already = new Set((sentToday ?? []).map((r) => r.user_id as string));
          const latest = new Map<string, string>();
          for (const r of rewards ?? []) if (!latest.has(r.user_id as string)) latest.set(r.user_id as string, r.next_claim_at as string);

          for (const uid of batch) {
            if (already.has(uid)) continue;
            const next = latest.get(uid);
            if (next && new Date(next) > now) continue; // not claimable yet
            const title = "Your daily reward is ready 🎁";
            const body = "Open TradeVirt to claim your free Trading Credits.";
            await admin.from("notifications").insert({ user_id: uid, title, body, kind: "DAILY_REMINDER" });
            await sendPushToUser(admin, uid, title, body, "DAILY_REMINDER");
          }
        }
        return Response.json({ ok: true });
      },
    },
  },
});
