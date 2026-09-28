/** Server-only: sends push notifications to a user's registered devices via FCM. */
type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

/** Screen to open when the notification is tapped, by notification kind. */
export function pathForKind(kind: string): string {
  switch (kind) {
    case "LEVEL_UP":
    case "BADGE":
      return "/profile";
    case "CHALLENGE":
      return "/challenges";
    case "TRADE":
    case "STOP_LOSS_HIT":
    case "TAKE_PROFIT_HIT":
      return "/profile";
    default:
      if (kind.startsWith("COMPETE")) return "/compete";
      if (kind.startsWith("ARENA")) return "/ai-arena";
      if (kind.startsWith("CAREER")) return "/career";
      return "/home";
  }
}

export async function sendPushToUser(
  admin: Admin,
  userId: string,
  title: string,
  body: string,
  kind: string,
): Promise<void> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovableKey || !connKey) return;

  const { data: tokens } = await admin.from("push_tokens").select("token").eq("user_id", userId);
  if (!tokens?.length) return;

  const path = pathForKind(kind);
  await Promise.all(
    tokens.map(async ({ token }) => {
      try {
        const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": connKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body },
              data: { path, kind },
              android: { priority: "HIGH", notification: { channel_id: "tradevirt_default" } },
            },
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          if (res.status === 404 || (res.status === 400 && text.includes("INVALID_ARGUMENT")) || text.includes("UNREGISTERED")) {
            await admin.from("push_tokens").delete().eq("token", token);
          } else {
            console.error(`Push send failed [${res.status}]: ${text}`);
          }
        }
      } catch (e) {
        console.error("Push send error", e);
      }
    }),
  );
}
