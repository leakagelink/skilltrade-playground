/**
 * In-app (native) Google sign-in for the Android/iOS app. Shows the Google
 * account picker inside the app instead of opening the browser, then hands the
 * Google ID token to our auth backend. Returns null on the website.
 */
import { supabase } from "@/integrations/supabase/client";

// Public OAuth "Web application" client ID (same one configured in auth settings).
const WEB_CLIENT_ID = "913550827647-7tcnongkvbv2ltqobq2la8a8rosom8fa.apps.googleusercontent.com";

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

export async function isNativeTradeVirtApp() {
  try {
    const { Capacitor } = await withTimeout(import("@capacitor/core"), 5000, "Native platform check");
    return Capacitor.isNativePlatform();
  } catch (e) {
    console.error("[google-native] platform check failed:", e);
    return false;
  }
}

export async function signInWithGoogleNative(): Promise<{ error: Error | null; cancelled?: boolean }> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) {
      return { error: new Error("Native Google sign-in is only available in the TradeVirt app.") };
    }

    // Use the package's official client wrapper. Creating a second proxy with
    // registerPlugin can miss the native implementation in remotely hosted apps.
    const { SocialLogin } = await withTimeout(
      import("@capgo/capacitor-social-login"),
      10000,
      "Google sign-in plugin",
    );
    if (!initialized) {
      console.log("[google-native] initializing plugin");
      await withTimeout(
        SocialLogin.initialize({ google: { webClientId: WEB_CLIENT_ID, mode: "online" } }),
        15000,
        "Google sign-in setup",
      );
      initialized = true;
    }
    console.log("[google-native] opening account picker");
    const res = await withTimeout(
      SocialLogin.login({ provider: "google", options: { scopes: ["email", "profile"] } }),
      60000,
      "Google account picker",
    );
    console.log("[google-native] picker returned", JSON.stringify(res).slice(0, 200));
    if (res.result.responseType !== "online") {
      return { error: new Error("Google returned an unsupported sign-in response.") };
    }
    const idToken = res.result.idToken;
    if (!idToken) return { error: new Error("Google did not return a sign-in token.") };
    const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
    return { error: error ? new Error(error.message) : null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[google-native] sign-in failed:", msg);
    if (/cancel/i.test(msg)) return { error: null, cancelled: true };
    return { error: new Error(msg) };
  }
}
