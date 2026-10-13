# Roadmap

- [x] Add trade-result and saved Strategy Lab Continue interstitials, retain Career/challenge/Arena completion placements, 7/day and 2-minute gap, deduplicated preloading, SDK-confirmed display counting, Home/Profile banners and Privacy v1.10; 40 tests passed and signed-in strategy save/result/Continue/read-back verified with test entry removed. No separate lesson or Strategy Lab run flow exists; no ads added to active order/decision-check workflows.
- [ ] Verify new interstitial display and dismissal on Android — requires a rebuilt Android release/test device and AdMob availability; no production publish or release performed.

- [x] Correct Privacy, Terms, Disclaimer, Support and account-deletion disclosures for Meta, paid subscriptions and additive practice tools; all five pages browser-verified and 35 tests passed. Meta collection disabled pending separate consent; AdMob fails closed on UMP uncertainty. Android setup fixture confirms stale flags disabled.
- [ ] Publish corrected policies and ship rebuilt Android consent safeguards; verify Play Console Data Safety and native consent/purchase behavior — requires user-authorized publishing, Android release/device testing and Play Console declarations.

- [x] Add genuinely distinct paid practice benefits: Basic risk planner, Pro discipline report/CSV and Elite stress lab; preserve Free tools, enforce verified server tiers and update comparison/Terms. Calculation and billing tests passed; signed-in Free locks and mobile/desktop checked.
- [ ] Verify paid workbench with an actual eligible subscription and real Google Play purchase on Android — current preview account is Free; do not fabricate entitlement.

- [x] Differentiate Basic/Pro/Elite with detailed truthful benefits, Free comparison and monthly/yearly explanations without changing entitlements; 26 tests passed and cards/comparison checked on mobile and desktop.

- [x] Polish subscription plan cards using the supplied reference and preserve exact Google Play numeric prices without upward rounding; 22 billing/cache tests passed and isolated cards checked at mobile/desktop widths.
- [ ] Verify real Google Play prices/purchases on Android — signed-in pricing page checked; native device required.

- [x] Add admin signup/activity reports by day, week, month and year, with user/country breakdowns and honest install/download availability.
- [ ] Connect verified download/install reporting — requires Google Play/App Store or Firebase reporting access.
- [ ] Verify admin activity reports while signed in — preview session unavailable; requesting user's account could not be minted.

- [x] Optimize admin panel for desktop and mobile without changing other app screens.

- [ ] Connect Logo.dev in new workspace (connect card declined)
- [x] Fix auth flash: signed-in users land on home
- [x] Faster crypto momentum via Coinbase live rates
- [x] v1.1: AI Trade Coach, Trader DNA, Trading Personality, AI Insights history, performance trend, share card, AI badges, legal updates
- [x] v1.2: Beat the AI Arena (4 rule-based opponents, isolated arena portfolio, server-side scoring/timer/winner, arena trades, history, badges, XP, privacy update)
- [x] v1.3: Trading Career Mode (7 stages, server-derived missions & rewards, specializations, career map, milestone details, profile entry point, privacy/deletion updates)
- [x] v1.4: Social Competition (friend challenges with invite links, open public challenges, weekly tournaments, server-side Simulation Competition Score & rankings, optional country + public profile privacy controls, global/country ranks, sharing, competition badges/XP, privacy & deletion updates)

## Version 2.0 — AdMob monetization (complete)
- Genuine Google AdMob rewarded + interstitial ads via @capacitor-community/admob (native Android only).
- Centralized IDs/limits in src/lib/ads/config.ts; official Google test units outside production builds.
- Server-authoritative limits and idempotent nonce-based reward grants (user_ad_activity, ad_reward_grants).
- Rewarded placements: AI Coach bonus analysis, Career milestone, Arena result. Interstitials: career milestone / challenge / arena continue.
- Legacy simulated rewarded-ad code (fake countdown, test token endpoint) removed.
- Privacy, Terms and account deletion updated; Android setup in ANDROID_ADMOB_SETUP.md.

## Firebase Analytics + Crashlytics (native Android only)
- @capacitor-firebase/analytics and @capacitor-firebase/crashlytics installed; google-services.json stored at android-config/ (no android/ folder in repo).
- Centralized service src/lib/analytics.ts with a strict non-personal parameter allow-list; no-op on web/SSR.
- Events: sign_up_completed, login_completed, logout_completed, trade_opened, trade_closed, daily_reward_claimed, ai_coach_used, trader_dna_viewed, ai_arena_started, career_mode_started, career_level_completed, leaderboard_viewed.
- Crashlytics: automatic crash capture plus a non-fatal from the root error boundary (no PII, no tokens).
- Firebase web SDK stubbed in vite config (native-only usage); production build verified.

## V2 remaining features (complete)
- Practice Center (Profile → Practice Center): Trade Journal, Weekly Practice Summary, Milestones, Practice Streak, Practice Insights, Decision Check toggle, Market Replay (marked unavailable — no verified historical data, no fake replay).
- Optional "Check Your Trade Plan" before BUY/SELL (off by default, never blocks).
- New private `trade_journals` table (owner-only RLS); journal text never sent to analytics.

## Subscriptions (Google Play)
- [x] Plans screen, server verification, ad-free enforcement for Pro/Elite
- [ ] Google Play service account secret (GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) — waiting on user
- [ ] Create products in Play Console — waiting on user
- [x] Reconnect Firebase Cloud Messaging in new workspace

## Pending
- [ ] Admin panel: AdMob revenue (daily/yesterday/weekly/monthly/last month) — blocked: needs AdMob Reporting API OAuth from user's Google/AdMob account (service accounts not supported by AdMob API).
