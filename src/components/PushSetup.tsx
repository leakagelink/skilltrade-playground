import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { registerPushToken } from "@/lib/push.functions";
import { setupPush } from "@/lib/push-client";

const OPT_OUT_KEY = "tv_push_opt_out";

/** Registers this phone for notifications once the user is signed in (native app only). */
export function PushSetup() {
  const navigate = useNavigate();
  const register = useServerFn(registerPushToken);

  useEffect(() => {
    if (localStorage.getItem(OPT_OUT_KEY) === "1") return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void setupPush({
      // Never consume Android's one-time permission prompt in the background.
      // The user explicitly requests it with the Settings toggle.
      prompt: false,
      onToken: (token, platform) => void register({ data: { token, platform } }).catch(() => {}),
      onOpen: (path) => void navigate({ to: path }),
    }).then((r) => {
      if (cancelled) r.cleanup?.();
      else cleanup = r.cleanup;
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [navigate, register]);

  return null;
}

export { OPT_OUT_KEY };
