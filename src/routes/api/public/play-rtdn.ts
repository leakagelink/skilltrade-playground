import { createFileRoute } from "@tanstack/react-router";

/**
 * Google Play Real-time Developer Notifications (Pub/Sub push).
 * The caller is verified with a shared token in the push URL. Notification
 * contents are never trusted: every subscription is re-queried from the
 * Google Play Developer API and the stored row is overwritten (idempotent).
 * Purchase tokens and credentials are never logged.
 */
import { parseRtdnPush, rtdnPatch, rtdnToken, safeEqual } from "@/lib/billing/rtdn";

export const Route = createFileRoute("/api/public/play-rtdn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["PLAY_RTDN_TOKEN"] ?? "";
        const got = new URL(request.url).searchParams.get("token") ?? "";
        if (!expected || !safeEqual(got, expected)) return new Response("Unauthorized", { status: 401 });

        let raw: unknown = null;
        try { raw = await request.json(); } catch { /* malformed */ }
        const msg = parseRtdnPush(raw);
        if (!msg) return Response.json({ ok: true, ignored: "malformed" }); // ack so Pub/Sub stops retrying junk

        const { ANDROID_PACKAGE, PLANS } = await import("@/lib/billing/plans");
        if (msg.packageName !== ANDROID_PACKAGE) return Response.json({ ok: true, ignored: "package" });
        if (msg.testNotification) {
          console.log("[rtdn] test notification received");
          return Response.json({ ok: true, test: true });
        }

        const token = rtdnToken(msg);
        if (!token) return Response.json({ ok: true, ignored: "no-subscription" });

        const play = await import("@/lib/billing/play.server");
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const hash = await play.sha256(token);
        const { data: row } = await db.from("play_subscriptions").select("id,product_id,expires_at").eq("purchase_token_hash", hash).maybeSingle();
        // Unknown tokens are not yet linked to an account; the app links them after its own verification.
        if (!row) return Response.json({ ok: true, ignored: "unknown" });

        let sub;
        try {
          sub = await play.fetchSubscription(token);
        } catch (e) {
          console.error("[rtdn] Google re-query failed:", (e as Error).message);
          return new Response("Retry", { status: 503 }); // Pub/Sub retries later
        }
        const voided = !!msg.voidedPurchaseNotification;
        const patch = rtdnPatch(sub, voided, row);
        const status = patch.status;
        if (PLANS.some((p) => p.productId === row.product_id)) {
          if (!voided && status === "SUBSCRIPTION_STATE_ACTIVE" && sub?.acknowledgementState !== "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED") {
            await play.acknowledge(row.product_id, token).catch(() => undefined);
          }
          await db.from("play_subscriptions").update(patch).eq("id", row.id);
        }
        console.log("[rtdn] updated", { type: msg.subscriptionNotification?.notificationType ?? "voided", status });
        return Response.json({ ok: true });
      },
    },
  },
});
