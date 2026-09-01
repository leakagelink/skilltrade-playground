import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — PaperEdge" },
      { name: "description", content: "How PaperEdge handles your account data, simulated trading activity and privacy settings." },
      { property: "og:title", content: "Privacy Policy — PaperEdge" },
      { property: "og:description", content: "How PaperEdge handles account data and simulated trading activity." },
    ],
  }),
  component: () => (
    <LegalPage
      title="Privacy Policy"
      updated="Version 1.0"
      sections={[
        {
          heading: "Data we store",
          body: "Your email address (for authentication only), your chosen username, avatar, and your simulated trading activity: trades, XP, credits, challenge progress, badges and scores.",
        },
        {
          heading: "What is never public",
          body: "Your email address, virtual balance, credit history and individual trades are private to your account. The public leaderboard shows only username, avatar, level and Trading Skill Score.",
        },
        {
          heading: "Leaderboard privacy",
          body: "You can hide your profile from all public leaderboards at any time in Settings. When hidden, your account is excluded from every leaderboard period.",
        },
        {
          heading: "Financial data",
          body: "PaperEdge never collects payment details, bank information or cryptocurrency wallet addresses, because no real-money transactions exist in the application.",
        },
        {
          heading: "Advertising",
          body: "Rewarded advertisements are optional and never required. When an advertising provider is enabled, ad delivery may involve that provider's own data handling, disclosed at that time.",
        },
        {
          heading: "Deleting your data",
          body: "Deleting your account from Settings permanently removes your profile and all associated simulated trading records.",
        },
      ]}
    />
  ),
});
