import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { APP_INFO, OPERATED_BY } from "@/lib/app-config";

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
          heading: "0. Who operates TradeVirt",
          body: `${OPERATED_BY} Developer / representative: ${APP_INFO.developer}. Support: ${APP_INFO.supportEmail}. Official website: ${APP_INFO.website}.`,
        },
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
          body: "You agree not to attempt to manipulate simulated balances, credits, XP, scores, or leaderboard rankings, and not to use automated means to abuse daily rewards or challenge rewards.",
        },
        {
          heading: "4. Accounts",
          body: "You are responsible for keeping your account credentials secure. You may delete your account at any time from Settings, which permanently removes your profile, simulated trades and progress.",
        },
        {
          heading: "5. Rewards",
          body: "All Version 1.0 rewards are virtual: XP, levels, badges, virtual Trading Credits and leaderboard position. Trading Credits come from the new-account bonus, the 24-hour daily reward and challenges only; Version 1.0 contains no advertisements and no way to earn credits from advertising. No cash, cryptocurrency, gift cards or other prizes of monetary value are offered.",
        },
        {
          heading: "6. No warranty and market data",
          body: "Market prices and chart data may be delayed, incomplete or temporarily unavailable, and are provided solely for educational simulation purposes. The service is provided on an as-is basis without warranty of accuracy, availability or fitness for a particular purpose, and nothing in it constitutes financial, investment, trading or legal advice.",
        },
        {
          heading: "7. AI insights, Trader DNA and Trading Personality",
          body: "AI-generated insights are based on simulated trading activity and are provided for educational and informational purposes only. They do not constitute financial, investment, trading or legal advice and do not guarantee trading performance or future market outcomes. Trader DNA and Trading Personality are educational, gamified summaries of simulated activity and are not financial assessments, investment recommendations or psychological evaluations. AI features are free in this version and may be subject to fair-use limits.",
        },
        {
          heading: "8. Changes",
          body: "These terms may be updated as the application evolves. Continued use after an update constitutes acceptance of the revised terms.",
        },
      ]}
    />
  ),
});
