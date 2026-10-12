/**
 * Server-only Google Play Developer API access (subscriptionsv2), using a
 * service account in GOOGLE_PLAY_SERVICE_ACCOUNT_JSON. RS256 JWT via Web Crypto.
 */
import { ANDROID_PACKAGE } from "./plans";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

let cached: { token: string; exp: number } | null = null;

export function playConfigured(): boolean {
  return readSa() !== null;
}

function readSa(): ServiceAccount | null {
  const raw = process.env["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"];
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw) as ServiceAccount;
    return sa.client_email && sa.private_key ? sa : null;
  } catch {
    return null;
  }
}

function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pem(p: string): ArrayBuffer {
  const body = p.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

async function accessToken(): Promise<string> {
  const sa = readSa();
  if (!sa) throw new Error("Google Play verification is not configured.");
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp > now + 60) return cached.token;
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await crypto.subtle.importKey("pkcs8", pem(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${b64url(sig)}` }),
  });
  if (!res.ok) throw new Error(`Google auth failed [${res.status}]`);
  const d = (await res.json()) as { access_token: string; expires_in?: number };
  cached = { token: d.access_token, exp: now + (d.expires_in ?? 3600) };
  return d.access_token;
}

export type PlaySubscription = {
  subscriptionState: string;
  acknowledgementState?: string;
  startTime?: string;
  latestOrderId?: string;
  linkedPurchaseToken?: string;
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
  lineItems?: {
    productId: string;
    expiryTime?: string;
    autoRenewingPlan?: { autoRenewEnabled?: boolean };
    offerDetails?: { basePlanId?: string };
  }[];
};

const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE}/purchases`;

export async function fetchSubscription(purchaseToken: string): Promise<PlaySubscription | null> {
  const res = await fetch(`${BASE}/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
  });
  if (res.status === 404 || res.status === 410 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Google Play verification failed [${res.status}]`);
  return (await res.json()) as PlaySubscription;
}

export async function acknowledge(productId: string, purchaseToken: string): Promise<void> {
  const res = await fetch(
    `${BASE}/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
    { method: "POST", headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" }, body: "{}" },
  );
  if (!res.ok && res.status !== 400) throw new Error(`Acknowledge failed [${res.status}]`);
}

export async function sha256(s: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Opaque per-user account id passed to Play so tokens are bound to one account. */
export async function accountIdFor(userId: string): Promise<string> {
  return (await sha256(`tradevirt:${userId}`)).slice(0, 64);
}
