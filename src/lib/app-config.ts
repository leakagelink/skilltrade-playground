/**
 * Central application identity + external URL configuration.
 * Update values here only — no page should hardcode contact or domain details.
 */

export const APP_INFO = {
  name: "TradeVirt",
  developer: "Dheeraj Tagde",
  company: "Socilet",
  supportEmail: "hello@socilet.in",
  website: "https://socilet.in",
} as const;

export const OPERATED_BY = `${APP_INFO.name} is developed and operated by ${APP_INFO.company}.`;

/**
 * External (public web) legal URLs used by app stores.
 * Leave empty until the pages actually exist and are publicly accessible.
 *
 * Future values (DO NOT enable until live):
 *   PRIVACY_POLICY_URL:   https://socilet.in/tradevirt/privacy-policy
 *   TERMS_URL:            https://socilet.in/tradevirt/terms
 *   DISCLAIMER_URL:       https://socilet.in/tradevirt/disclaimer
 *   ACCOUNT_DELETION_URL: https://socilet.in/tradevirt/account-deletion
 */
export const LEGAL_URLS = {
  PRIVACY_POLICY_URL: "",
  TERMS_URL: "",
  DISCLAIMER_URL: "",
  ACCOUNT_DELETION_URL: "",
} as const;

export type InternalLegalPath =
  | "/legal/terms"
  | "/legal/privacy"
  | "/legal/disclaimer"
  | "/legal/support"
  | "/account-deletion";

const EXTERNAL_BY_PATH: Record<InternalLegalPath, string> = {
  "/legal/terms": LEGAL_URLS.TERMS_URL,
  "/legal/privacy": LEGAL_URLS.PRIVACY_POLICY_URL,
  "/legal/disclaimer": LEGAL_URLS.DISCLAIMER_URL,
  "/legal/support": "",
  "/account-deletion": LEGAL_URLS.ACCOUNT_DELETION_URL,
};

/** Returns a configured external URL for a legal page, or null to use the in-app page. */
export function externalLegalUrl(path: InternalLegalPath): string | null {
  const url = EXTERNAL_BY_PATH[path]?.trim();
  return url ? url : null;
}
