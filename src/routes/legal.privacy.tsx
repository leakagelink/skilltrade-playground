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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage
      title="Privacy Policy"
      updated="Version 1.10 — October 13, 2026"
      sections={[
        {
          heading: "Who operates TradeVirt",
          body: `${OPERATED_BY} Developer / representative: ${APP_INFO.developer}. Official website: ${APP_INFO.website}. Privacy questions: ${APP_INFO.supportEmail}.`,
        },
        {
          heading: "Data we store",
          body: "Your email address and account identifier (for authentication), your name and email from Google if you choose Continue with Google, your chosen username, an optional full name and a mobile number that you provide when creating your account, used only as an alternative login identifier with your password (kept private, never shown to other users, never used for marketing and never shared or sold), avatar, optional country, and your simulated trading activity: trades, XP, credits, challenge progress, badges and scores. If you use the Practice Center, we also store your Trade Journal entries (thesis, strategy, entry and exit reasons, what went well or what to improve, notes, selected emotion and confidence rating) and your practice milestones, streak and insights.",
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
          heading: "Simulated trading and payments",
          body: "All trading, balances and trading rewards are simulated: TradeVirt does not offer real-money trading, deposits or withdrawals. Optional subscriptions are real-money purchases processed by Google Play. TradeVirt does not receive or store payment-card details, bank account information or cryptocurrency wallet addresses; we do process subscription purchase records as described below.",
        },
        {
          heading: "Push notifications",
          body: "If you allow notifications on your phone, the Android app registers a device push token with Google Firebase Cloud Messaging and we store it linked to your account so we can send you important updates: trades closed by stop loss or take profit, level-ups, badges, completed challenges, competition and AI Arena results, and daily reward reminders. Notifications never contain your password or financial information and never refer to real money. You can turn notifications off at any time in Settings or in Android settings; turning them off, signing out, or deleting your account removes your device tokens.",
        },
        {
          heading: "Advertising",
          body: "TradeVirt shows advertisements supplied by Google AdMob (Google Mobile Ads SDK) in the Android app: optional rewarded video ads that you choose to watch, occasional full-screen interstitial ads at natural break points, and small banner ads in a reserved space at the bottom of a few main browsing screens (Home, Profile, Leaderboard and Goals). Banner ads never cover content, charts or buttons and are never shown during sign-in, onboarding, order placement, trading charts, settings, legal pages or account deletion. Google may collect and process device and advertising identifiers to serve and measure ads, as described in Google's Privacy Policy (policies.google.com/privacy) and Google's advertising policies. Where required, a Google-provided consent form (UMP) is displayed before personalised ads are served, and you can reset or delete your advertising ID in Android settings. Rewards from ads are virtual only (an extra AI analysis, bonus XP, or a once-a-day bonus of virtual Trading Credits that doubles the daily reward) and have no monetary value. Rewarded ads can also unlock the AI Coach Agent for a limited time. We limit ads to a maximum of 8 rewarded and 3 interstitial ads per day. TradeVirt itself does not read or store your advertising ID and does not request device location permission or use GPS; any approximate location Google may infer (for example from IP address) is handled by the Google Mobile Ads SDK under Google's policies.",
        },
        {
          heading: "Subscriptions and purchase data",
          body: "Optional TradeVirt subscriptions (Basic, Pro and Elite) are sold only through Google Play Billing in the Android app. Google processes your payment; TradeVirt never receives or stores your card, bank or other payment details. When you subscribe or restore purchases, the app sends the Google Play purchase token to our server, which confirms it directly with the Google Play Developer API before any benefit is granted. We store, linked to your account: the plan, billing period, subscription status, start and expiry dates, auto-renewal status, the Google order ID, the purchase token and a one-way hash of it. Google Play also notifies our server when a subscription renews, is cancelled, paused, expires, is refunded or revoked, and our server then re-checks the subscription with Google. An opaque, one-way identifier derived from your account is attached to purchases so a subscription cannot be used by another account. This data is used only to provide and verify your subscription, prevent fraud and handle support, is not used for advertising and is never sold. It is deleted with your account; Google keeps its own purchase records under Google's Privacy Policy.",
        },
        {
          heading: "Analytics and crash reporting",
          body: "In the Android app we use Google Firebase Analytics and Firebase Crashlytics to understand which features are used and to detect crashes. Firebase Analytics records app-usage events (for example: a simulated trade was opened, a challenge was completed, a screen was viewed) together with device and app information and app-instance or advertising identifiers. Crashlytics records crash and error diagnostics, including device state and a technical error label. Device-linked identifiers mean this information should not be considered fully anonymous. We do not attach your email address, username, password, authentication token, TradeVirt account identifier, virtual balance or individual trade details to these events. Firebase Authentication, Firestore and Firebase Storage are not used. This data is processed by Google as described in Google's Privacy Policy (https://policies.google.com/privacy) and is never sold by TradeVirt. Analytics and crash reporting are not active in the web version.",
        },
        {
          heading: "Meta App Events and advertising measurement",
          body: "Earlier Android builds include active Meta (Facebook) App Events for app activation, advertising attribution and measurement of how features are used. In the current web update, explicit Meta event sending is disabled. Newly rebuilt Android releases also disable Meta SDK automatic initialization, event logging and advertising-ID collection until a separate Meta-specific consent flow is implemented. Already installed older releases may still use the active SDK, which may collect device and app information, advertising identifiers, network information such as IP address, and app activity. Those older builds send allow-listed events such as app open, registration, login, content views, searches, simulated trades opened or closed, challenge completion, strategy creation and educational review usage, with limited non-sensitive categories. We do not attach your name, email, phone number, TradeVirt account identifier, passwords, authentication tokens, balances, trade amounts, profit or loss, or journal text to these events. Meta may process SDK information under its own privacy policy (https://www.facebook.com/privacy/policy/); device-linked events are not guaranteed to be anonymous. Google AdMob's consent form does not itself describe or control Meta's separate processing. Ad-free subscriptions remove in-app advertisements, not automatically Firebase or Meta measurement. You can reset or delete your Android advertising ID in device settings. Meta-held records follow Meta's retention and privacy-request procedures and are not automatically erased by deleting your TradeVirt account. This integration is not active on the website.",
        },
        {
          heading: "Third-party services",
          body: "We use a managed cloud backend for authentication, database storage and server functions, Google Sign-In for optional authentication, and public third-party market data sources for stock and crypto prices. In the Android app we also use Google Play Billing for subscription purchases, Google AdMob for advertising, Google Firebase Analytics and Crashlytics for usage statistics and crash reporting, Firebase Cloud Messaging for notifications, and Meta App Events for advertising attribution and measurement. The optional AI Coach Agent uses RelayModels as described below.",
        },

        {
          heading: "Market data providers",
          body: "The application may use third-party market data providers to display market prices and chart information. Market data may be delayed, incomplete or temporarily unavailable and is shown for educational simulation only.",
        },
        {
          heading: "AI Insights and Trader DNA",
          body: "When you request an educational AI review of a completed simulated trade, a minimised and anonymised set of simulated trade metrics (asset category, trade direction, entry and exit price, position size as a percentage of your virtual balance, stop loss and take profit usage, holding duration, simulated result and aggregate simulated statistics) is used by our rule-based review engine on our servers. Your email address, password, authentication token, user identifier and real personal information are never sent. AI reviews and Trader DNA scores are calculated and stored server-side and are visible only to you.",
        },
        {
          heading: "AI Coach Agent",
          body: "If you use the AI Coach Agent, the question you type and up to your last four chat messages are sent exactly as written (they are not anonymised) to our AI provider (RelayModels, which routes to Anthropic Claude models) to generate an educational answer. Your email, password, user identifier and account details are not sent. Please do not type personal or sensitive information. Chats are not stored on our servers; we only keep a daily usage counter and your unlock time. If you report an answer, that question and answer are stored for moderation. You get 1 free question per day; watching optional rewarded ads (maximum 3 per day) unlocks the agent for 5, 10 or 24 hours. Unlocks are virtual and have no monetary value. AI answers may be inaccurate and are not financial advice.",
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
          heading: "Practice Center and Trade Journal",
          body: "The Practice Center lets you keep a private Trade Journal: your written thesis, strategy, entry and exit reasons, what went well or what to improve, notes, your selected emotion and confidence rating. Journal entries are stored server-side, are visible only to you, and are used only to show your journal, weekly summaries, milestones, streaks and neutral, rule-based practice insights. The optional \"Check Your Trade Plan\" feature is a short reflection checklist shown on your device before a simulated trade; it is educational only, is off by default, and never blocks, alters or places a trade. Journal text is never shared, sold or sent to any third-party AI service.",
        },
        {
          heading: "Paid practice tools and exports",
          body: "Basic's position and risk planner processes your entered virtual capital, risk percentage, entry, stop and target on our authenticated server. Pro's discipline report reads up to your latest 500 closed simulated trades and calculates a rule-based report; Elite's stress lab processes virtual capital, risk percentage and hypothetical losing-streak inputs. We check your current subscription eligibility on each request. These calculation inputs and generated reports are not saved as new practice records, sold, or sent to a third-party AI provider. Existing simulated trade records remain subject to your account's normal retention. If you download a CSV report, the file is saved to your device and remains under your control; deleting your account does not delete copies you exported. The tools are educational calculations, not financial advice or predictions.",
        },
        {
          heading: "Social competitions and public profiles",
          body: "If you take part in friend challenges, open challenges or weekly tournaments, we store your participation, the simulated trades you place inside that competition, your virtual balance for it and the resulting Simulation Competition Score and ranking. Competition results are visible to the other participants of the same competition. You may optionally select a country and turn on a public trader profile; when enabled, other users can see only your username, avatar, level, Trading Skill Score, badges and (if you allow it) your country. We never display your email address, phone number, account identifiers, precise location or your private trades. If you follow other public traders, we store who follows whom so follower and following counts can be shown; you can unfollow at any time. Your shareable Trader Card shows only the same public details and is always labelled as simulated performance. TradeVirt does not request device location, and every competition uses virtual funds only with no entry fee, wager, cash prize or transferable reward.",
        },
        {
          heading: "How we use your data",
          body: "We use account data to authenticate you, manage your account, provide simulated trading and learning features, maintain your portfolio, journal and progress, calculate educational scores and reports, run competitions and leaderboards, verify subscription benefits, prevent fraud, provide support and improve reliability. Google and Meta SDK data is also processed for the advertising, attribution, usage measurement and diagnostic purposes described above. We do not sell your data.",
        },
        {
          heading: "Account activity and admin reporting",
          body: "On the website and in updated Android/iOS builds, we record signed-in foreground visits linked to your account: calendar activity day in India time, first and latest visit timestamps for that day, and platform (web, Android or iOS). These records measure signup growth and active accounts and are accessible only to authorised administrators, alongside registration and onboarding details for account management. Country breakdowns use only the optional country you supplied; we do not collect GPS coordinates, city, device fingerprints or advertising identifiers for these reports. Account-linked activity is stored in our cloud backend, is not sent to Firebase or Meta, is not sold, and is deleted with your profile. Activity counts are not download or installation counts; older activity before tracking was enabled is unavailable.",
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
          body: `You can delete your account from Settings inside the app, or request deletion by emailing ${APP_INFO.supportEmail} from your registered address. In-app deletion removes your live account data immediately; verified email requests are processed within 30 days. Deletion removes your profile, simulated trades, credit history, XP, challenge progress, AI reviews, Trader DNA records, Arena and Career Mode records, Trade Journal and practice progress, competition participation, ad-reward records, account activity, device push tokens and subscription records held by TradeVirt. Account deletion does not cancel your Google Play subscription: cancel it separately in Google Play to stop future renewal charges. Google retains its own purchase records. Firebase and Meta SDK records are not linked by us to your TradeVirt account identifier but may be linked to device or app identifiers; their retention and deletion follow the respective providers' policies. CSV reports and other copies you exported remain on your device. Backup copies may persist for a short period before being overwritten, and anonymised or legally required records may be retained.`,
        },
      ]}
    />
  ),
});
