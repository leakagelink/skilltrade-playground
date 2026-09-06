import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

/**
 * supabase.auth.getSession() can hang indefinitely when a token refresh stalls
 * (flaky mobile network, app resumed from background). The splash screen then
 * never resolves. Race it against a timeout so the UI always moves on.
 */
export async function getSessionSafe(timeoutMs = 3000): Promise<Session | null> {
  const stored = readStoredSession();
  try {
    const result = await Promise.race([
      supabase.auth.getSession().then(({ data }) => data.session ?? null),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), timeoutMs)),
    ]);
    if (result === "timeout") return stored;
    return result;
  } catch {
    return stored;
  }
}

/**
 * Supabase persists its session in localStorage under "sb-<ref>-auth-token".
 * Used as an offline/slow-network fallback.
 */
export function readStoredSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Session | { currentSession?: Session };
      const session = "currentSession" in parsed ? parsed.currentSession : parsed;
      if (session?.access_token) return session as Session;
    }
  } catch {
    // Storage blocked or corrupt value → treat as signed out.
  }
  return null;
}
