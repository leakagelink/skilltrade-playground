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
      { property: "og:url", content: "/account-deletion" },
    ],
    links: [{ rel: "canonical", href: "/account-deletion" }],
  }),
  component: () => (
    <LegalPage
      title="TradeVirt Account Deletion"
      updated="Version 1.6 — October 5, 2026"
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
          heading: "What is retained",
          body: "Deletion from the live database happens immediately when you confirm. TradeVirt keeps no payment or financial data because the app involves no real money. Anonymous Firebase analytics and crash reports are not linked to your account and follow Google's retention settings. Backup copies may persist for a short period before being overwritten, and anonymised or legally required records may be retained.",
        },
        {
          heading: "After deletion",
          body: "Deleted data cannot be restored. You may create a new account at any time; it starts fresh with a new $100,000 virtual balance, which has no monetary value.",
        },
      ]}
    />
  ),
});
