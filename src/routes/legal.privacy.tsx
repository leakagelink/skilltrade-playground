import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { APP_INFO, OPERATED_BY } from "@/lib/app-config";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — TradeVirt" },
      { name: "description", content: "How TradeVirt handles your account data, simulated trading activity and privacy settings." },
      { property: "og:title", content: "Privacy Policy — TradeVirt" },
      { property: "og:description", content: "How TradeVirt handles account data and simulated trading activity." },
    ],
  }),
  component: () => (
    <LegalPage
      title="Privacy Policy"
      updated="Version 1.2"
      sections={[
        {
          heading: "Who operates TradeVirt",
          body: `${OPERATED_BY} Developer / representative: ${APP_INFO.developer}. Official website: ${APP_INFO.website}. Privacy questions: ${APP_INFO.supportEmail}.`,
        },
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
          body: "TradeVirt never collects payment details, bank information or cryptocurrency wallet addresses, because no real-money transactions exist in the application.",
        },
        {
          heading: "Advertising",
          body: "Version 1.0 of TradeVirt contains no advertising SDK and shows no advertisements. No advertising or tracking identifiers are collected. If advertising is ever introduced, this policy will be updated before it becomes active.",
        },
        {
          heading: "Third-party services",
          body: "We use a managed cloud backend (Supabase) for authentication, database storage and server functions, Google Sign-In for optional authentication, and public third-party market data sources for stock and crypto prices. No analytics or advertising SDK is active in Version 1.0.",
        },
        {
          heading: "Market data providers",
          body: "The application may use third-party market data providers to display market prices and chart information. Market data may be delayed, incomplete or temporarily unavailable and is shown for educational simulation only.",
        },
        {
          heading: "AI Insights and Trader DNA",
          body: "When you request an educational AI review of a completed simulated trade, a minimised and anonymised set of simulated trade metrics (asset category, trade direction, entry and exit price, position size as a percentage of your virtual balance, stop loss and take profit usage, holding duration, simulated result and aggregate simulated statistics) is sent to an AI provider through the Lovable AI gateway. Your email address, password, authentication token, user identifier and real personal information are never sent. AI reviews and Trader DNA scores are calculated and stored server-side and are visible only to you.",
        },
        {
          heading: "AI Arena",
          body: "The AI Arena is a simulated trading competition against rule-based AI opponents using virtual funds. If you take part, we store your Arena sessions, the simulated Arena trades you place, the AI opponent's simulated trades, timings and the resulting Arena Scores. This activity is visible only to you, is calculated on our servers, and involves no real money, deposits, withdrawals or prizes of monetary value.",
        },
        {
          heading: "Trading Career Mode",
          body: "Career Mode records your simulation progress: your current career stage, the cosmetic career title you have reached, completed career milestones and the educational learning path you select. This progress is calculated on our servers from activity you already carry out in the app (simulated trades, challenges, AI reviews and AI Arena sessions) and is visible only to you. Career rewards are virtual XP, titles and badges with no monetary value.",
        },
        {
          heading: "Social competitions and public profiles",
          body: "If you take part in friend challenges, open challenges or weekly tournaments, we store your participation, the simulated trades you place inside that competition, your virtual balance for it and the resulting Simulation Competition Score and ranking. Competition results are visible to the other participants of the same competition. You may optionally select a country and turn on a public trader profile; when enabled, other users can see only your username, avatar, level, Trading Skill Score, badges and (if you allow it) your country. We never display your email address, phone number, account identifiers, precise location or your private trades. TradeVirt does not request device location, and every competition uses virtual funds only with no entry fee, wager, cash prize or transferable reward.",
        },
        {
          heading: "How we use your data",
          body: "Your data is used only to authenticate you, manage your account, provide paper trading functionality, maintain your simulated portfolio and trade history, calculate your Trading Skill Score, calculate Trader DNA and educational AI insights, run challenges, AI Arena competitions, social competitions and tournaments, Career Mode progression and leaderboards, and improve reliability. We do not sell your data.",
        },
        {
          heading: "Security",
          body: "We implement reasonable technical and organisational measures designed to protect user information, including row-level database security and server-side validation of all account, credit and trade operations. No system can be guaranteed to be completely secure.",
        },
        {
          heading: "Children",
          body: "TradeVirt is intended for users who meet the minimum age required by the applicable app store rating and local law. We do not knowingly collect data from children below that age.",
        },
        {
          heading: "Policy changes",
          body: "We may update this Privacy Policy from time to time. The version indicator at the top of this page reflects the current revision.",
        },
        {
          heading: "Deleting your data and retention",
          body: `You can delete your account from Settings inside the app, which removes your account immediately, or email ${APP_INFO.supportEmail} from your registered address. Deletion removes your profile, simulated trades, credit history, XP, challenge progress, AI reviews, Trader DNA records, AI Arena sessions and Arena trades, Career Mode progress and milestones, and your competition participation and competition trades. Backup copies may persist for a short period before being overwritten, and anonymised or legally required records may be retained.`,
        },
      ]}
    />
  ),
});
