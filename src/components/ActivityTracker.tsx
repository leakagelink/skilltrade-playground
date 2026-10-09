import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordActivity } from "@/lib/admin-activity.functions";
import { getSessionSafe } from "@/lib/session";

/** First-party foreground activity only; never sends identifiers to ad analytics. */
export function ActivityTracker() {
  const record = useServerFn(recordActivity);
  useEffect(() => {
    let cancelled = false;
    let pending = false;
    let lastRecorded = 0;
    const tick = async () => {
      if (cancelled || pending || document.visibilityState !== "visible" || Date.now() - lastRecorded < 240_000) return;
      pending = true;
      try {
        const session = await getSessionSafe();
        if (!session || cancelled) return;
        const { Capacitor } = await import("@capacitor/core");
        const platform = Capacitor.getPlatform();
        await record({ data: { platform: platform === "android" || platform === "ios" ? platform : "web" } });
        lastRecorded = Date.now();
      } catch {
        // Recording must never block authentication, trading or navigation.
      } finally { pending = false; }
    };
    void tick();
    const interval = window.setInterval(() => void tick(), 60_000);
    const visible = () => void tick();
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", visible);
    };
  }, [record]);
  return null;
}