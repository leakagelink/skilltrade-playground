# Roadmap

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
