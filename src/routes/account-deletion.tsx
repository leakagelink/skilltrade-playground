import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { APP_INFO, OPERATED_BY } from "@/lib/app-config";

export const Route = createFileRoute("/account-deletion")({
  head: () => ({
    meta: [
      { title: "Delete Your Account — TradeVirt" },
      { name: "description", content: "How to permanently delete your TradeVirt account and all associated simulated trading data." },
      { property: "og:title", content: "Delete Your Account — TradeVirt" },
      { property: "og:description", content: "Steps to permanently delete your TradeVirt account and data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "/account-deletion" },
    ],
    links: [{ rel: "canonical", href: "/account-deletion" }],
  }),
  component: () => (
    <LegalPage
      title="TradeVirt Account Deletion"
      updated="Version 1.8 — October 13, 2026"
      sections={[
        {
          heading: "Who operates TradeVirt",
          body: `${OPERATED_BY} Developer / representative: ${APP_INFO.developer}. Support for account deletion: ${APP_INFO.supportEmail}. Official website: ${APP_INFO.website}.`,
        },
        {
          heading: "Delete from inside the app",
          body: "Open TradeVirt, go to Settings, tap Delete account and confirm. The request is processed by the server immediately: your authentication record and account data are removed and you are signed out.",
        },
        {
          heading: "Request deletion by email",
          body: `If you cannot access the app, email ${APP_INFO.supportEmail} from your registered email address with the subject 'Delete my account'. We process verified requests within 30 days. You do not need to visit any other website to delete your account.`,
        },
        {
          heading: "What is deleted",
          body: "Your authentication record, profile, username, full name, mobile number and its private login lookup, avatar, virtual balance, credits, XP, level, Trading Skill Score, simulated trades, challenge progress, badges, AI trade reviews, Trader DNA records, AI Arena sessions and Arena trades, Career Mode progress and milestones, your Practice Center Trade Journal entries, practice milestones, streak and insights, social competition participation and competition trades, AI Coach Agent usage counters, unlocks and reported answers, ad-reward records, push notification device tokens, notifications, public profile settings and leaderboard entries are permanently removed.",
        },
        {
          heading: "Account activity reports",
          body: "Account-linked foreground activity days, first and latest visit timestamps and platform records used for private admin reports are deleted automatically when your profile is deleted. Country breakdowns use the optional country in your profile, which is also removed. Download and install reports from app stores or third-party analytics, if available separately, follow those providers' retention rules.",
        },
        {
          heading: "Subscriptions and exported reports",
          body: "Deleting your account removes subscription verification records held by TradeVirt, including the account-linked plan, status, purchase token and its hash, order identifier and billing dates. It does not cancel a subscription in Google Play or erase Google's purchase records. Before deleting, use Manage subscription in the app or Google Play → Payments & subscriptions → Subscriptions to cancel future renewals. Refund requests follow Google Play's refund policy. CSV reports and other files you downloaded remain on your device and must be deleted by you.",
        },
        {
          heading: "What is retained",
          body: "Deletion from the live database happens immediately when you confirm. TradeVirt does not hold payment-card or bank details. Google retains its own subscription purchase records. Firebase analytics and crash reports and Meta App Events records may be associated with device or app identifiers, even though we do not attach your TradeVirt account identifier. These third-party records are not automatically erased by deleting your TradeVirt account and follow Google's and Meta's privacy, retention and deletion procedures (https://policies.google.com/privacy and https://www.facebook.com/privacy/policy/). Backup copies may persist for a short period before being overwritten, and anonymised or legally required records may be retained.",
        },
        {
          heading: "After deletion",
          body: "Deleted data cannot be restored. You may create a new account at any time; it starts fresh with a new $100,000 virtual balance, which has no monetary value.",
        },
      ]}
    />
  ),
});
