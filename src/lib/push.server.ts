/** Server-only: sends push notifications via FCM HTTP v1, directly with the Firebase service account (no gateway). */
type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function getServiceAccount(): ServiceAccount | null {
  const raw = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    return null;
  }
}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): Uint8Array {
  const body = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60) return cachedAccessToken.token;

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key) as unknown as ArrayBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const jwt = `${header}.${claims}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new Error(`FCM auth failed [${res.status}]: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  cachedAccessToken = { token: data.access_token, expiresAt: now + (data.expires_in ?? 3600) };
  return data.access_token;
}

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

async function sendToFcm(
  sa: ServiceAccount,
  deviceToken: string,
  title: string,
  body: string,
  kind: string,
): Promise<{ ok: boolean; status: number; unregistered: boolean; error?: string }> {
  const accessToken = await getAccessToken(sa);
  const path = pathForKind(kind);
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: { title, body },
        data: { path, kind },
        android: { priority: "HIGH", notification: { channel_id: "tradevirt_default" } },
      },
    }),
  });
  if (res.ok) return { ok: true, status: res.status, unregistered: false };
  const text = await res.text();
  return { ok: false, status: res.status, unregistered: res.status === 404 || text.includes("UNREGISTERED"), error: text };
}

export type PushResult = { sent: number; removed: number; configured: boolean; error?: string | undefined };

export async function sendPushToUser(
  admin: Admin,
  userId: string,
  title: string,
  body: string,
  kind: string,
): Promise<PushResult> {
  const sa = getServiceAccount();
  if (!sa) return { sent: 0, removed: 0, configured: false, error: "FIREBASE_SERVICE_ACCOUNT_JSON is not configured" };

  const { data: tokens } = await admin.from("push_tokens").select("token").eq("user_id", userId);
  if (!tokens?.length) return { sent: 0, removed: 0, configured: true };

  let sent = 0;
  let removed = 0;
  let lastError: string | undefined;
  for (const { token } of tokens) {
    try {
      const result = await sendToFcm(sa, token, title, body, kind);
      if (result.ok) {
        sent++;
      } else if (result.unregistered) {
        await admin.from("push_tokens").delete().eq("token", token);
        removed++;
      } else {
        lastError = `[${result.status}] ${result.error?.slice(0, 300)}`;
        console.error(`Push send failed: ${lastError}`);
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error("Push send error", e);
    }
  }
  return { sent, removed, configured: true, error: lastError };
}

export async function broadcastPushToAll(
  admin: Admin,
  title: string,
  body: string,
  kind: string,
): Promise<PushResult & { devices: number }> {
  const sa = getServiceAccount();
  if (!sa) return { sent: 0, removed: 0, devices: 0, configured: false, error: "FIREBASE_SERVICE_ACCOUNT_JSON is not configured" };

  const { data: tokens, error } = await admin.from("push_tokens").select("token");
  if (error) return { sent: 0, removed: 0, devices: 0, configured: true, error: error.message };
  if (!tokens?.length) return { sent: 0, removed: 0, devices: 0, configured: true };

  let sent = 0;
  let removed = 0;
  let lastError: string | undefined;
  for (const { token } of tokens) {
    try {
      const result = await sendToFcm(sa, token, title, body, kind);
      if (result.ok) {
        sent++;
      } else if (result.unregistered) {
        await admin.from("push_tokens").delete().eq("token", token);
        removed++;
      } else {
        lastError = `[${result.status}] ${result.error?.slice(0, 300)}`;
        console.error(`Broadcast push failed: ${lastError}`);
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error("Broadcast push error", e);
    }
  }
  return { sent, removed, devices: tokens.length, configured: true, error: lastError };
}
