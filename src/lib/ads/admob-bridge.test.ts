import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  initialize: vi.fn(),
  requestConsentInfo: vi.fn(),
  prepareInterstitial: vi.fn(),
  showInterstitial: vi.fn(),
  addListener: vi.fn(),
  callbacks: new Map<string, () => void>(),
  remove: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock("@capacitor-community/admob", () => ({
  AdMob: sdk,
  AdmobConsentStatus: { REQUIRED: "required" },
  InterstitialAdPluginEvents: { Showed: "showed", AdImpression: "impression", Dismissed: "dismissed", FailedToShow: "failed" },
}));

beforeEach(() => {
  vi.stubGlobal("window", {});
  vi.resetModules();
  vi.clearAllMocks();
  sdk.callbacks.clear();
  sdk.requestConsentInfo.mockResolvedValue({ canRequestAds: true, isConsentFormAvailable: false });
  sdk.prepareInterstitial.mockResolvedValue({});
  sdk.initialize.mockResolvedValue(undefined);
  sdk.remove.mockResolvedValue(undefined);
  sdk.addListener.mockImplementation(async (event: string, callback: () => void) => {
    sdk.callbacks.set(event, callback);
    return { remove: sdk.remove };
  });
  sdk.showInterstitial.mockResolvedValue(undefined);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("native interstitial lifecycle", () => {
  it("skips an unready ad instead of delaying the user's continuation", async () => {
    const bridge = await import("./admob-bridge");
    expect(await bridge.showInterstitialAd()).toBe(false);
    expect(sdk.showInterstitial).not.toHaveBeenCalled();
  });
  it("deduplicates preloading", async () => {
    const bridge = await import("./admob-bridge");
    await Promise.all([bridge.preloadInterstitial(), bridge.preloadInterstitial()]);
    expect(sdk.prepareInterstitial).toHaveBeenCalledTimes(1);
  });
  it("counts a genuine display once and waits for dismissal", async () => {
    const bridge = await import("./admob-bridge");
    await bridge.preloadInterstitial();
    const report = vi.fn();
    let resolved = false;
    sdk.showInterstitial.mockImplementation(async () => {
      sdk.callbacks.get("showed")?.();
      sdk.callbacks.get("impression")?.();
    });
    const showing = bridge.showInterstitialAd(report).then((shown) => { resolved = true; return shown; });
    await vi.waitFor(() => expect(report).toHaveBeenCalledTimes(1));
    expect(resolved).toBe(false);
    expect(await bridge.showInterstitialAd()).toBe(false);
    sdk.callbacks.get("dismissed")?.();
    expect(await showing).toBe(true);
    expect(sdk.remove).toHaveBeenCalledTimes(4);
  });
  it("does not count method acceptance or failed display as an impression", async () => {
    const bridge = await import("./admob-bridge");
    await bridge.preloadInterstitial();
    const report = vi.fn();
    sdk.showInterstitial.mockImplementation(async () => sdk.callbacks.get("failed")?.());
    expect(await bridge.showInterstitialAd(report)).toBe(false);
    expect(report).not.toHaveBeenCalled();
  });
  it("fails closed when UMP does not permit requests", async () => {
    sdk.requestConsentInfo.mockResolvedValue({ canRequestAds: false, isConsentFormAvailable: false });
    const bridge = await import("./admob-bridge");
    await bridge.preloadInterstitial();
    expect(await bridge.showInterstitialAd()).toBe(false);
    expect(sdk.prepareInterstitial).not.toHaveBeenCalled();
  });
});