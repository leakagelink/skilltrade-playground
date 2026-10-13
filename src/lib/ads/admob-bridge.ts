/**
 * Browser/native bridge for Google Mobile Ads (AdMob).
 *
 * The Android app is a Capacitor wrapper, so the real Google Mobile Ads SDK is
 * reached through @capacitor-community/admob. On the web (or if the SDK is not
 * available) every call degrades gracefully — nothing throws, nothing blocks.
 *
 * There is no simulated ad, no countdown timer and no fake completion: a
 * reward is only ever reported when the genuine SDK reward callback fires.
 */
import {
  AD_FLAGS,
  ADMOB_APP_ID,
  ADS_USE_TEST_ADS,
  BANNER_AD_UNIT_ID,
  INTERSTITIAL_AD_UNIT_ID,
  REWARDED_AD_UNIT_ID,
} from "./config";

type AdMobModule = typeof import("@capacitor-community/admob");

let initPromise: Promise<AdMobModule | null> | null = null;
let sdkPromise: Promise<AdMobModule | null> | null = null;
let lastFailureAt = 0;
/** After a failed SDK/consent check, wait this long before trying again. */
const INIT_RETRY_MS = 20_000;
let rewardedLoaded = false;
let interstitialLoaded = false;
let interstitialLoading: Promise<void> | null = null;
let interstitialShowing = false;

async function isNative(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Initialises the Google Mobile Ads SDK exactly once per app process. */
async function initSdk(): Promise<AdMobModule | null> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = (async () => {
    try {
      const mod = await import("@capacitor-community/admob");
      await mod.AdMob.initialize({ initializeForTesting: ADS_USE_TEST_ADS });
      return mod;
    } catch {
      sdkPromise = null; // allow a later retry
      return null;
    }
  })();
  return sdkPromise;
}

/**
 * Returns the SDK only when Google UMP says ads may be requested. A failed
 * check fails closed for this attempt but is retried later, so one network
 * hiccup at launch can no longer block ads for the whole app session.
 */
export async function initAds(): Promise<AdMobModule | null> {
  if (!AD_FLAGS.ADS_ENABLED) return null;
  if (initPromise) return initPromise;
  if (lastFailureAt && Date.now() - lastFailureAt < INIT_RETRY_MS) return null;

  initPromise = (async () => {
    if (!(await isNative())) return null; // web: permanently no ads
    const mod = await initSdk();
    if (!mod) {
      lastFailureAt = Date.now();
      initPromise = null;
      return null;
    }
    // Google User Messaging Platform (UMP) consent — official Google tooling.
    try {
      let info = await mod.AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === mod.AdmobConsentStatus.REQUIRED) {
        info = await mod.AdMob.showConsentForm();
      }
      // UMP can allow limited ads without personalised-ad consent. Use its
      // request decision, never infer consent from merely closing the form.
      // Not permitted now → re-check later (consent may change) instead of
      // caching "no ads" for the whole session.
      if (!info.canRequestAds) {
        lastFailureAt = Date.now();
        initPromise = null;
        return null;
      }
    } catch {
      // Do not request ads when consent eligibility could not be determined;
      // retry on a later ad opportunity instead of blocking the whole session.
      lastFailureAt = Date.now();
      initPromise = null;
      return null;
    }
    lastFailureAt = 0;
    return mod;
  })();

  return initPromise;
}

export async function adsAvailable(): Promise<boolean> {
  return (await initAds()) !== null;
}

/** App ID is declared in the Android manifest; exported for the setup docs. */
export const ANDROID_ADMOB_APP_ID = ADMOB_APP_ID;

/* ------------------------------------------------------------------ */
/* Rewarded ads                                                        */
/* ------------------------------------------------------------------ */

export async function preloadRewarded(): Promise<void> {
  if (!AD_FLAGS.REWARDED_ADS_ENABLED) return;
  const mod = await initAds();
  if (!mod || rewardedLoaded) return;
  try {
    await mod.AdMob.prepareRewardVideoAd({
      adId: REWARDED_AD_UNIT_ID,
      isTesting: ADS_USE_TEST_ADS,
    });
    rewardedLoaded = true;
  } catch {
    rewardedLoaded = false;
  }
}

/**
 * Shows a rewarded ad. Resolves `true` only when the Google SDK reports a
 * genuine earned reward. Any failure resolves `false` and never blocks the UI.
 */
export async function showRewardedAd(): Promise<boolean> {
  if (!AD_FLAGS.REWARDED_ADS_ENABLED) return false;
  const mod = await initAds();
  if (!mod) return false;
  try {
    if (!rewardedLoaded) {
      await mod.AdMob.prepareRewardVideoAd({
        adId: REWARDED_AD_UNIT_ID,
        isTesting: ADS_USE_TEST_ADS,
      });
      rewardedLoaded = true;
    }
    const reward = await mod.AdMob.showRewardVideoAd();
    rewardedLoaded = false;
    // Release the consumed ad object and warm the next one.
    void preloadRewarded();
    return Boolean(reward && typeof reward.amount === "number" && reward.amount >= 0 && reward.type !== undefined);
  } catch {
    rewardedLoaded = false;
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Interstitial ads                                                    */
/* ------------------------------------------------------------------ */

export async function preloadInterstitial(): Promise<void> {
  if (!AD_FLAGS.INTERSTITIAL_ADS_ENABLED) return;
  const mod = await initAds();
  if (!mod || interstitialLoaded || interstitialShowing) return;
  if (interstitialLoading) return interstitialLoading;
  interstitialLoading = (async () => {
    try {
      await mod.AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_UNIT_ID, isTesting: ADS_USE_TEST_ADS });
      interstitialLoaded = true;
    } catch {
      interstitialLoaded = false;
    } finally {
      interstitialLoading = null;
    }
  })();
  return interstitialLoading;
}

/** Max time the Continue button waits for a not-yet-loaded interstitial. */
const INTERSTITIAL_LOAD_WAIT_MS = 3_500;

/**
 * Shows an interstitial. If none is preloaded yet, waits briefly for one to
 * load (bounded), so the first natural break of a session can still show an ad.
 * SDK display events, not show() acceptance, count impressions.
 */
export async function showInterstitialAd(onShown?: () => void): Promise<boolean> {
  if (!AD_FLAGS.INTERSTITIAL_ADS_ENABLED) return false;
  const mod = await initAds();
  if (!mod || interstitialShowing) return false;
  if (!interstitialLoaded) {
    await Promise.race([
      preloadInterstitial(),
      new Promise<void>((resolve) => setTimeout(resolve, INTERSTITIAL_LOAD_WAIT_MS)),
    ]);
    if (!interstitialLoaded || interstitialShowing) return false;
  }
  interstitialShowing = true;
  interstitialLoaded = false;
  const listeners: Array<{ remove: () => Promise<void> }> = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let displayed = false;
  let finished = false;
  let finish: () => void = () => {};
  const dismissed = new Promise<void>((resolve) => {
    finish = () => { finished = true; resolve(); };
  });
  try {
    const markShown = () => {
      if (displayed || finished) return;
      displayed = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(finish, 120_000);
      try { onShown?.(); } catch { /* reporting never blocks dismissal */ }
    };
    listeners.push(await mod.AdMob.addListener(mod.InterstitialAdPluginEvents.Showed, markShown));
    listeners.push(await mod.AdMob.addListener(mod.InterstitialAdPluginEvents.AdImpression, markShown));
    listeners.push(await mod.AdMob.addListener(mod.InterstitialAdPluginEvents.Dismissed, finish));
    listeners.push(await mod.AdMob.addListener(mod.InterstitialAdPluginEvents.FailedToShow, finish));
    timer = setTimeout(finish, 8_000);
    await mod.AdMob.showInterstitial();
    await dismissed;
    return displayed;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
    await Promise.all(listeners.map((listener) => listener.remove().catch(() => {})));
    interstitialShowing = false;
    void preloadInterstitial();
  }
}

/* ------------------------------------------------------------------ */
/* Banner ads (small, bottom, reserved space — never over content)     */
/* ------------------------------------------------------------------ */

let bannerVisible = false;
let bannerWanted = false;
let bannerRetry: ReturnType<typeof setTimeout> | undefined;
/** After a banner fails to load (e.g. no fill), request a fresh one after this delay. */
const BANNER_RETRY_MS = 45_000;
let bannerHeight = 0;
const bannerHeightListeners = new Set<(height: number) => void>();
let bannerListenersAttached = false;

function setBannerHeight(height: number): void {
  const next = Number.isFinite(height) && height > 0 ? height : 0;
  if (next === bannerHeight) return;
  bannerHeight = next;
  for (const listener of bannerHeightListeners) listener(bannerHeight);
}

/** Subscribes to the on-screen banner height (0 when no banner is showing). */
export function subscribeBannerHeight(listener: (height: number) => void): () => void {
  bannerHeightListeners.add(listener);
  listener(bannerHeight);
  return () => {
    bannerHeightListeners.delete(listener);
  };
}

function scheduleBannerRetry(): void {
  if (bannerRetry) clearTimeout(bannerRetry);
  bannerRetry = setTimeout(() => {
    bannerRetry = undefined;
    if (bannerWanted && !bannerVisible) void showBannerAd();
  }, BANNER_RETRY_MS);
}

async function attachBannerListeners(mod: AdMobModule): Promise<void> {
  if (bannerListenersAttached) return;
  bannerListenersAttached = true;
  try {
    await mod.AdMob.addListener(mod.BannerAdPluginEvents.SizeChanged, (info) => {
      setBannerHeight(info?.height ?? 0);
    });
    await mod.AdMob.addListener(mod.BannerAdPluginEvents.FailedToLoad, () => {
      setBannerHeight(0);
      // A failed banner is never re-requested by resumeBanner(); drop it so
      // the next show creates a fresh request, and retry while still wanted.
      bannerVisible = false;
      void mod.AdMob.removeBanner().catch(() => {});
      scheduleBannerRetry();
    });
  } catch {
    /* listeners are optional — layout simply keeps its default spacing */
  }
}

/** Shows the adaptive banner at the bottom of the screen. */
export async function showBannerAd(): Promise<boolean> {
  if (!AD_FLAGS.BANNER_ADS_ENABLED) return false;
  bannerWanted = true;
  const mod = await initAds();
  if (!mod) {
    scheduleBannerRetry();
    return false;
  }
  if (!bannerWanted) return false;
  await attachBannerListeners(mod);
  try {
    if (!bannerVisible) {
      bannerVisible = true;
      await mod.AdMob.showBanner({
        adId: BANNER_AD_UNIT_ID,
        adSize: mod.BannerAdSize.ADAPTIVE_BANNER,
        position: mod.BannerAdPosition.BOTTOM_CENTER,
        isTesting: ADS_USE_TEST_ADS,
        margin: 0,
      });
    } else {
      await mod.AdMob.resumeBanner();
    }
    return true;
  } catch {
    bannerVisible = false;
    scheduleBannerRetry();
    return false;
  }
}

/** Hides (does not destroy) the banner so it can be resumed cheaply later. */
export async function hideBannerAd(): Promise<void> {
  bannerWanted = false;
  if (bannerRetry) {
    clearTimeout(bannerRetry);
    bannerRetry = undefined;
  }
  if (!bannerVisible) return;
  const mod = await initAds();
  if (!mod) return;
  try {
    await mod.AdMob.hideBanner();
  } catch {
    /* ignore */
  }
  setBannerHeight(0);
}
