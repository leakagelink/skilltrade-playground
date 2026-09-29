/**
 * In-app (native) Google sign-in for the Android/iOS app. Shows the Google
 * account picker inside the app instead of opening the browser, then hands the
 * Google ID token to our auth backend. Returns null on the website.
 */
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

// Public OAuth "Web application" client ID (same one configured in auth settings).
const WEB_CLIENT_ID = "913550827647-7tcnongkvbv2ltqobq2la8a8rosom8fa.apps.googleusercontent.com";

let initializationPromise: Promise<void> | null = null;
let signInAttempt: Promise<{ error: Error | null; cancelled?: boolean }> | null = null;

// Never let a native call hang the UI: race it against a timeout.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out — please try again.`)), ms),
    ),
  ]);
}

export function isNativeTradeVirtApp() {
  return Capacitor.isNativePlatform();
}

async function runNativeGoogleSignIn(): Promise<{ error: Error | null; cancelled?: boolean }> {
  try {
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
    if (!initializationPromise) {
      console.log("[google-native] initializing plugin");
      initializationPromise = withTimeout(
        SocialLogin.initialize({ google: { webClientId: WEB_CLIENT_ID, mode: "online" } }),
        15000,
        "Google sign-in setup",
      ).catch((error) => {
        initializationPromise = null;
        throw error;
      });
    }
    await initializationPromise;

    console.log("[google-native] opening account picker");
    const res = await withTimeout(
      // Do not pass explicit scopes for authentication-only login. The Android
      // plugin already requests openid/email/profile by default; passing the
      // same values as custom scopes activates its modified-MainActivity guard.
      // Start with Credential Manager's recommended bottom-sheet flow. The
      // plugin itself clears stale state and falls back to the standard picker
      // only when Google reports that no usable credential is available.
      SocialLogin.login({
        provider: "google",
        options: {
          style: "bottom",
          filterByAuthorizedAccounts: false,
          autoSelectEnabled: false,
        },
      }),
      60000,
      "Google account picker",
    );
    console.log("[google-native] account picker completed");
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
    if (/Account reauth failed|No credentials available/i.test(msg)) {
      return {
        error: new Error(
          "Google could not verify the selected account. Remove TradeVirt from your Google Account’s connected apps, then try again with a regular Google account.",
        ),
      };
    }
    return { error: new Error(msg) };
  }
}

export function signInWithGoogleNative(): Promise<{ error: Error | null; cancelled?: boolean }> {
  // React state updates are asynchronous, so two fast taps can otherwise open
  // two native Credential Manager requests before the button becomes disabled.
  if (signInAttempt) return signInAttempt;
  signInAttempt = runNativeGoogleSignIn().finally(() => {
    signInAttempt = null;
  });
  return signInAttempt;
}
