import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

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
      updated="Version 1.0"
      sections={[
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
          body: "Market data in this application may be simulated or delayed. It is never presented as a live execution feed and must not be relied on for real-world trading decisions.",
        },
        {
          heading: "AI simulation",
          body: "Where an AI simulation is shown, its performance is generated on simulated data only. AI simulation performance does not represent guaranteed investment results.",
        },
      ]}
    />
  ),
});
