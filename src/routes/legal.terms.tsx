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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage
      title="Terms of Service"
      updated="Version 1.7 — October 13, 2026"
      sections={[
        {
          heading: "0. Who operates TradeVirt",
          body: `${OPERATED_BY} Developer / representative: ${APP_INFO.developer}. Support: ${APP_INFO.supportEmail}. Official website: ${APP_INFO.website}.`,
        },
        {
          heading: "1. Nature of the service",
          body: "TradeVirt is a simulated paper trading and educational skill-development application. It is not a broker, exchange, investment adviser, or financial transaction service. All trading is simulated. No real-money trading, deposits or withdrawals are available.",
        },
        {
          heading: "1A. Subscriptions (Google Play)",
          body: "TradeVirt offers optional Basic, Pro and Elite subscriptions, each billed monthly or yearly, purchased only through Google Play in the Android app. The price, currency and any taxes are shown by Google Play before you confirm. Subscriptions renew automatically at the end of each billing period at the then-current price unless you cancel at least 24 hours before renewal in Google Play → Payments & subscriptions → Subscriptions, or from Manage subscription in the app. After cancelling, your plan stays active until the end of the period already paid for; uninstalling the app or deleting your account does not cancel a Google Play subscription. Pro and Elite remove in-app ads; Basic keeps ads. Benefits are granted only after Google Play confirms the purchase, and pending payments do not unlock benefits until confirmed. Refunds are handled by Google Play under its refund policy (support.google.com/googleplay); refunded, revoked or charged-back subscriptions end immediately. Use Restore purchases to reconnect an existing subscription to your account. Subscriptions do not add virtual balance or Trading Credits, have no cash value, and do not enable real-money trading.",
        },
        {
          heading: "1B. Additive practice benefits",
          body: "All existing Free tools remain available under their existing usage rules. Basic adds a position and risk planner; Pro includes Basic plus ad-free access, a personal rule-based discipline report on the latest 500 closed simulated trades and CSV report export; Elite includes Pro plus hypothetical losing-streak stress tests, fixed-versus-resized risk comparisons and drawdown-recovery calculations. Monthly and yearly plans provide the same tier benefits. Each new tool requires a verified, unexpired eligible subscription when executed. These tools do not use AI credits, execute trades, award virtual funds or predict market outcomes. Calculations exclude fees, slippage, gaps and instrument-specific lot rules. Reports use your existing simulated trade records; planner inputs are processed for the calculation and are not saved as a new practice record. CSV exports are downloaded to your device, where you control their retention. Stress scenarios are educational what-if calculations, not historical backtests or guarantees.",
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
          body: "All rewards in TradeVirt are virtual: XP, levels, badges, virtual Trading Credits and leaderboard position. Trading Credits come from the new-account bonus, the 24-hour daily reward (which you may optionally double once a day by watching a rewarded ad) and challenges. TradeVirt shows optional Google AdMob rewarded ads, occasional interstitial ads and small banner ads on a few main browsing screens; watching a rewarded ad can unlock only an extra AI analysis, bonus XP or the optional daily-reward bonus, all virtual and limited per day. No cash, cryptocurrency, gift cards or other prizes of monetary value are offered.",
        },
        {
          heading: "6. No warranty and market data",
          body: "Market prices and chart data may be delayed, incomplete or temporarily unavailable, and are provided solely for educational simulation purposes. The service is provided on an as-is basis without warranty of accuracy, availability or fitness for a particular purpose, and nothing in it constitutes financial, investment, trading or legal advice.",
        },
        {
          heading: "7. AI insights, Trader DNA and Trading Personality",
          body: "AI-generated insights are based on simulated trading activity and are provided for educational and informational purposes only. They do not constitute financial, investment, trading or legal advice and do not guarantee trading performance or future market outcomes. Trader DNA and Trading Personality are educational, gamified summaries of simulated activity and are not financial assessments, investment recommendations or psychological evaluations. The AI Coach Agent includes one free question per day; additional access is unlocked by watching optional rewarded ads (5, 10 or 24 hours of access per unlock, maximum 3 rewarded ads per day). These unlocks are virtual, have no monetary value and may be subject to fair-use limits. The Practice Center Trade Journal is a private educational notebook: your entries, weekly summaries, milestones and streaks are visible only to you. The optional \"Check Your Trade Plan\" reflection checklist is educational only, is off by default and never blocks, alters or places a trade.",
        },
        {
          heading: "8. Changes",
          body: "These terms may be updated as the application evolves. Continued use after an update constitutes acceptance of the revised terms.",
        },
      ]}
    />
  ),
});
