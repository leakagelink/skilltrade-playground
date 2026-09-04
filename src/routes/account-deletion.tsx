import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

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
      title="Delete Your Account"
      updated="Version 1.0"
      sections={[
        {
          heading: "Delete from inside the app",
          body: "Open TradeVirt, go to Settings, scroll to Danger zone and tap Delete account, then confirm. Deletion is immediate and permanent.",
        },
        {
          heading: "Request deletion by email",
          body: "If you cannot access the app, email support@tradevirt.app from your registered email address with the subject 'Delete my account'. We process verified requests within 30 days.",
        },
        {
          heading: "What is deleted",
          body: "Your authentication record, profile, username, avatar, virtual balance, credits, XP, level, Trading Skill Score, simulated trades, challenge progress, badges, notifications and leaderboard entries are permanently removed.",
        },
        {
          heading: "What is retained",
          body: "TradeVirt keeps no payment or financial data because the app involves no real money. Anonymous, non-identifying aggregate usage counts may remain for up to 90 days in backups before being overwritten.",
        },
        {
          heading: "After deletion",
          body: "Deleted data cannot be restored. You may create a new account at any time; it starts fresh with a new $100,000 virtual balance.",
        },
      ]}
    />
  ),
});
