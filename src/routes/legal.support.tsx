import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/legal/support")({
  head: () => ({
    meta: [
      { title: "Support & Contact — TradeVirt" },
      { name: "description", content: "Contact TradeVirt support for help with your paper trading account, bugs, data requests or feedback." },
      { property: "og:title", content: "Support & Contact — TradeVirt" },
      { property: "og:description", content: "Get help with your TradeVirt paper trading account." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/legal/support" },
    ],
    links: [{ rel: "canonical", href: "/legal/support" }],
  }),
  component: () => (
    <LegalPage
      title="Support & Contact"
      updated="Version 1.0"
      sections={[
        {
          heading: "Contact us",
          body: "Email support@tradevirt.app for account help, bug reports, privacy requests or feedback. We aim to reply within 3 business days.",
        },
        {
          heading: "Account help",
          body: "For login problems, include the email address on your account. We never ask for your password, and TradeVirt never requests payment details because the app involves no real money.",
        },
        {
          heading: "Reporting a bug",
          body: "Tell us the screen, the symbol you were viewing and what you expected to happen. Screenshots help us reproduce issues faster.",
        },
        {
          heading: "Data and privacy requests",
          body: "You can delete your account and all associated data yourself from Settings. For any other data request, email support@tradevirt.app from your registered address.",
        },
        {
          heading: "Market data",
          body: "Prices are delayed or indicative market data used for educational simulation. TradeVirt is not a broker and executes no real orders.",
        },
      ]}
    />
  ),
});
