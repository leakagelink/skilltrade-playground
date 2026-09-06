/**
 * Stub for the optional `firebase` web SDK peer dependency of the
 * @capacitor-firebase plugins. TradeVirt uses Firebase on native Android only,
 * so the web fallback path is never executed — this stub simply keeps the web
 * bundle building without pulling in the Firebase JS SDK.
 */
const unsupported = () => {
  throw new Error("Firebase web SDK is not used in TradeVirt (native Android only).");
};

export const getApp = unsupported;
export const initializeApp = unsupported;
export const getAnalytics = unsupported;
export const logEvent = unsupported;
export const setAnalyticsCollectionEnabled = unsupported;
export const setCurrentScreen = unsupported;
export const setUserId = unsupported;
export const setUserProperties = unsupported;
export const setConsent = unsupported;
export const isSupported = async () => false;
