import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — TradeVirt" },
      { name: "description", content: "Terms of service for TradeVirt, a simulated paper trading and trading skill development application." },
      { property: "og:title", content: "Terms of Service — TradeVirt" },
      { property: "og:description", content: "Terms governing use of the TradeVirt paper trading simulator." },
    ],
  }),
  component: () => (
    <LegalPage
      title="Terms of Service"
      updated="Version 1.0"
      sections={[
        {
          heading: "1. Nature of the service",
          body: "TradeVirt is a simulated paper trading and educational skill-development application. It is not a broker, exchange, investment adviser, or financial transaction service. No real-money trading is available.",
        },
        {
          heading: "2. Virtual balance and credits",
          body: "Your virtual balance and Trading Credits are simulation tokens with no monetary value. They cannot be deposited, withdrawn, transferred, exchanged, redeemed for money, or converted into cryptocurrency.",
        },
        {
          heading: "3. Acceptable use",
          body: "You agree not to attempt to manipulate simulated balances, credits, XP, scores, or leaderboard rankings, and not to use automated means to abuse rewarded advertisements or challenge rewards.",
        },
        {
          heading: "4. Accounts",
          body: "You are responsible for keeping your account credentials secure. You may delete your account at any time from Settings, which permanently removes your profile, simulated trades and progress.",
        },
        {
          heading: "5. Rewards",
          body: "All Version 1.0 rewards are virtual: XP, levels, badges, virtual Trading Credits and leaderboard position. No cash, cryptocurrency, gift cards or other prizes of monetary value are offered.",
        },
        {
          heading: "6. No warranty",
          body: "Market data may be simulated or delayed. The service is provided on an as-is basis without warranty of accuracy, availability or fitness for a particular purpose.",
        },
        {
          heading: "7. Changes",
          body: "These terms may be updated as the application evolves. Continued use after an update constitutes acceptance of the revised terms.",
        },
      ]}
    />
  ),
});
