import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { APP_INFO, OPERATED_BY } from "@/lib/app-config";

export const Route = createFileRoute("/legal/disclaimer")({
  head: () => ({
    meta: [
      { title: "Educational & Risk Disclaimer — TradeVirt" },
      { name: "description", content: "TradeVirt is for educational and simulation purposes only. Nothing in the app constitutes financial or investment advice." },
      { property: "og:title", content: "Educational & Risk Disclaimer — TradeVirt" },
      { property: "og:description", content: "Educational simulation only. Not financial advice." },
    ],
  }),
  component: () => (
    <LegalPage
      title="Educational & Risk Disclaimer"
      updated="Version 1.2"
      sections={[
        {
          heading: "Who operates TradeVirt",
          body: `${OPERATED_BY} Developer / representative: ${APP_INFO.developer}. Support: ${APP_INFO.supportEmail}. Official website: ${APP_INFO.website}.`,
        },
        {
          heading: "No real-money trading",
          body: "This application is for educational and simulated trading purposes only. No real-money trading is available through the application.",
        },
        {
          heading: "Educational purpose",
          body: "This application is intended for educational and simulation purposes only. It exists to help you practise trading mechanics, risk management and discipline in a risk-free environment.",
        },
        {
          heading: "Not financial advice",
          body: "Nothing in this application constitutes financial, investment, tax or legal advice. Trade reviews and AI-generated analysis are educational commentary on your simulated decisions and are never a recommendation to buy or sell anything.",
        },
        {
          heading: "No guarantee of results",
          body: "Past simulated performance does not guarantee future results. Simulated results differ from real markets, which involve execution costs, slippage, liquidity constraints and emotional pressure not fully modelled here.",
        },
        {
          heading: "No monetary value",
          body: "Virtual currency and credits have no monetary value. They cannot be withdrawn, transferred, exchanged, redeemed or converted into cryptocurrency.",
        },
        {
          heading: "Market data",
          body: "Market prices and chart data may be delayed, incomplete or temporarily unavailable. Market data is provided solely for educational simulation purposes and should not be relied upon for investment decisions. It is never a live execution feed.",
        },
        {
          heading: "AI and automated insights",
          body: "AI-generated insights and trade reviews are provided for educational and informational purposes only. They do not constitute financial or investment advice and do not guarantee trading performance or future market outcomes. Where an AI simulation is shown, its performance is generated on simulated data only.",
        },
        {
          heading: "Trader DNA and Trading Personality",
          body: "Trader DNA and Trading Personality features are educational and gamified summaries based on your simulated trading activity. They are not financial assessments, investment recommendations or psychological evaluations, and they do not predict real-world trading ability or outcomes.",
        },
      ]}
    />
  ),
});
