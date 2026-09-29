/**
 * In-app (native) Google sign-in for the Android/iOS app. Shows the Google
 * account picker inside the app instead of opening the browser, then hands the
 * Google ID token to our auth backend. Returns null on the website.
 */
import { supabase } from "@/integrations/supabase/client";

// Public OAuth "Web application" client ID (same one configured in auth settings).
const WEB_CLIENT_ID = "913550827647-7tcnongkvbv2ltqobq2la8a8rosom8fa.apps.googleusercontent.com";

type SocialLoginPlugin = {
  initialize: (o: { google: { webClientId: string; mode?: string } }) => Promise<void>;
  login: (o: { provider: "google"; options: { scopes?: string[] } }) => Promise<{ result: { idToken?: string | null } }>;
};

let initialized = false;

// Never let a native call hang the UI: race it against a timeout.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out — please try again.`)), ms),
    ),
  ]);
}

async function getPlugin(): Promise<SocialLoginPlugin | null> {
  const { Capacitor, registerPlugin } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("SocialLogin")) return null;
  return registerPlugin<SocialLoginPlugin>("SocialLogin");
}

export async function nativeGoogleAvailable() {
  return (await getPlugin()) !== null;
}

export async function signInWithGoogleNative(): Promise<{ error: Error | null; cancelled?: boolean }> {
  const plugin = await getPlugin();
  if (!plugin) return { error: new Error("Native Google sign-in unavailable") };
  try {
    if (!initialized) {
      await plugin.initialize({ google: { webClientId: WEB_CLIENT_ID, mode: "online" } });
      initialized = true;
    }
    const res = await plugin.login({ provider: "google", options: { scopes: ["email", "profile"] } });
    const idToken = res?.result?.idToken;
    if (!idToken) return { error: new Error("Google did not return a sign-in token.") };
    const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
    return { error: error ? new Error(error.message) : null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancel/i.test(msg)) return { error: null, cancelled: true };
    return { error: new Error(msg) };
  }
}
