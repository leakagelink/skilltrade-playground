/** Native (Android/iOS) push registration. Does nothing on the website. */
type Listener = { remove: () => Promise<void> };
type PushPlugin = {
  checkPermissions: () => Promise<{ receive: string }>;
  requestPermissions: () => Promise<{ receive: string }>;
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  createChannel: (c: { id: string; name: string; description?: string; importance?: number; visibility?: number }) => Promise<void>;
  addListener: (event: string, cb: (payload: any) => void) => Promise<Listener>;
};

async function getPlugin(): Promise<PushPlugin | null> {
  const { Capacitor, registerPlugin } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("PushNotifications")) return null;
  return registerPlugin<PushPlugin>("PushNotifications");
}

export async function pushAvailable() {
  return (await getPlugin()) !== null;
}

/**
 * Asks for permission (if needed), registers with FCM and hands the device
 * token to `onToken`. Returns false when permission is denied.
 */
export async function setupPush(opts: {
  prompt: boolean;
  onToken: (token: string, platform: "android" | "ios") => void;
  onOpen: (path: string) => void;
}): Promise<{ status: "unavailable" | "denied" | "registered"; cleanup?: () => void }> {
  const push = await getPlugin();
  if (!push) return { status: "unavailable" };
  const { Capacitor } = await import("@capacitor/core");

  let perm = await push.checkPermissions();
  if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
    if (!opts.prompt) return { status: "denied" };
    perm = await push.requestPermissions();
  }
  if (perm.receive !== "granted") return { status: "denied" };

  try {
    await push.createChannel({
      id: "tradevirt_default",
      name: "TradeVirt alerts",
      description: "Trades, rewards, challenges and competitions",
      importance: 4,
      visibility: 1,
    });
  } catch {
    /* iOS has no channels */
  }

  const listeners = await Promise.all([
    push.addListener("registration", (t: { value: string }) =>
      opts.onToken(t.value, Capacitor.getPlatform() === "ios" ? "ios" : "android"),
    ),
    push.addListener("registrationError", (e: unknown) => console.error("Push registration error", e)),
    push.addListener("pushNotificationActionPerformed", (a: { notification?: { data?: { path?: string } } }) => {
      const path = a.notification?.data?.path;
      if (path && path.startsWith("/")) opts.onOpen(path);
    }),
  ]);
  await push.register();
  return { status: "registered", cleanup: () => listeners.forEach((l) => void l.remove()) };
}

export async function disablePush() {
  const push = await getPlugin();
  if (push) await push.unregister().catch(() => {});
}
