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
let rewardedLoaded = false;
let interstitialLoaded = false;

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
export async function initAds(): Promise<AdMobModule | null> {
  if (!AD_FLAGS.ADS_ENABLED) return null;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!(await isNative())) return null;
    try {
      const mod = await import("@capacitor-community/admob");
      await mod.AdMob.initialize({ initializeForTesting: ADS_USE_TEST_ADS });
      // Google User Messaging Platform (UMP) consent — official Google tooling.
      try {
        const info = await mod.AdMob.requestConsentInfo();
        if (info.isConsentFormAvailable && info.status === mod.AdmobConsentStatus.REQUIRED) {
          await mod.AdMob.showConsentForm();
        }
      } catch {
        /* consent unavailable in this region/build — continue without ads consent form */
      }
      return mod;
    } catch {
      return null;
    }
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
  if (!mod || interstitialLoaded) return;
  try {
    await mod.AdMob.prepareInterstitial({
      adId: INTERSTITIAL_AD_UNIT_ID,
      isTesting: ADS_USE_TEST_ADS,
    });
    interstitialLoaded = true;
  } catch {
    interstitialLoaded = false;
  }
}

/** Shows an interstitial at a natural break. Returns true if it was displayed. */
export async function showInterstitialAd(): Promise<boolean> {
  if (!AD_FLAGS.INTERSTITIAL_ADS_ENABLED) return false;
  const mod = await initAds();
  if (!mod) return false;
  try {
    if (!interstitialLoaded) {
      await mod.AdMob.prepareInterstitial({
        adId: INTERSTITIAL_AD_UNIT_ID,
        isTesting: ADS_USE_TEST_ADS,
      });
      interstitialLoaded = true;
    }
    await mod.AdMob.showInterstitial();
    interstitialLoaded = false;
    void preloadInterstitial();
    return true;
  } catch {
    interstitialLoaded = false;
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Banner ads (small, bottom, reserved space — never over content)     */
/* ------------------------------------------------------------------ */

let bannerVisible = false;
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

async function attachBannerListeners(mod: AdMobModule): Promise<void> {
  if (bannerListenersAttached) return;
  bannerListenersAttached = true;
  try {
    await mod.AdMob.addListener(mod.BannerAdPluginEvents.SizeChanged, (info) => {
      setBannerHeight(info?.height ?? 0);
    });
    await mod.AdMob.addListener(mod.BannerAdPluginEvents.FailedToLoad, () => {
      setBannerHeight(0);
    });
  } catch {
    /* listeners are optional — layout simply keeps its default spacing */
  }
}

/** Shows the adaptive banner at the bottom of the screen. */
export async function showBannerAd(): Promise<boolean> {
  if (!AD_FLAGS.BANNER_ADS_ENABLED) return false;
  const mod = await initAds();
  if (!mod) return false;
  await attachBannerListeners(mod);
  try {
    if (!bannerVisible) {
      await mod.AdMob.showBanner({
        adId: BANNER_AD_UNIT_ID,
        adSize: mod.BannerAdSize.ADAPTIVE_BANNER,
        position: mod.BannerAdPosition.BOTTOM_CENTER,
        isTesting: ADS_USE_TEST_ADS,
        margin: 0,
      });
      bannerVisible = true;
    } else {
      await mod.AdMob.resumeBanner();
    }
    return true;
  } catch {
    return false;
  }
}

/** Hides (does not destroy) the banner so it can be resumed cheaply later. */
export async function hideBannerAd(): Promise<void> {
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
