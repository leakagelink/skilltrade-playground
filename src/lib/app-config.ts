/**
 * Central application identity + external URL configuration.
 * Update values here only — no page should hardcode contact or domain details.
 */

export const APP_INFO = {
  name: "TradeVirt",
  developer: "Dheeraj Tagde",
  company: "Socilet",
  supportEmail: "hello@tradevirt.online",
  website: "https://tradevirt.online",
} as const;

export const OPERATED_BY = `${APP_INFO.name} is developed and operated by ${APP_INFO.company}.`;

/**
 * Public web legal URLs used by app stores. These are the live pages served
 * from the connected custom domain.
 */
export const LEGAL_URLS = {
  PRIVACY_POLICY_URL: "https://tradevirt.online/legal/privacy",
  TERMS_URL: "https://tradevirt.online/legal/terms",
  DISCLAIMER_URL: "https://tradevirt.online/legal/disclaimer",
  ACCOUNT_DELETION_URL: "https://tradevirt.online/account-deletion",
} as const;

export type InternalLegalPath =
  | "/legal/terms"
  | "/legal/privacy"
  | "/legal/disclaimer"
  | "/legal/support"
  | "/account-deletion";

// The legal pages are served by this same app, so in-app navigation stays
// internal. LEGAL_URLS above are the public equivalents for store listings.
const EXTERNAL_BY_PATH: Record<InternalLegalPath, string> = {
  "/legal/terms": "",
  "/legal/privacy": "",
  "/legal/disclaimer": "",
  "/legal/support": "",
  "/account-deletion": "",
};

/** Returns a configured external URL for a legal page, or null to use the in-app page. */
export function externalLegalUrl(path: InternalLegalPath): string | null {
  const url = EXTERNAL_BY_PATH[path]?.trim();
  return url ? url : null;
}
