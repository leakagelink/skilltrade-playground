# Skill Trader

Build a Production-Ready Mobile-First Paper Trading App – Version 1.0

Build a complete, production-ready, mobile-first paper trading application.

This is NOT a real-money trading platform, broker, investment advisor, exchange, or financial transaction app.

The app is strictly for:

Educational trading practice

Paper trading

Virtual portfolio simulation

Trading skill development

Gamified trading challenges

Users must NEVER deposit, withdraw, transfer, invest, or trade real money through this application.

1. CORE PRODUCT CONCEPT

Create a modern gamified paper trading platform where users can practice trading using virtual money.

The core experience should be:

User creates an account.

User receives virtual starting credits and virtual trading balance.

User selects a market or asset.

User analyzes a real or delayed market chart.

User opens simulated paper trades.

The system tracks simulated profit and loss.

User earns XP and improves their Trading Skill Score.

Users can participate in challenges and compete on leaderboards.

Users receive daily virtual credits.

If credits are exhausted, the user can optionally watch a rewarded advertisement to receive additional virtual credits.

IMPORTANT:

Virtual credits are NOT cryptocurrency.
Virtual credits are NOT cash.
Virtual credits have NO monetary value.
Virtual credits cannot be withdrawn, transferred, exchanged, redeemed for money, or converted into cryptocurrency.

2. PRODUCT POSITIONING

The application should feel like:

Duolingo-style progression

Modern trading simulator

Gamified skill development platform

Primary message:

"Practice Trading. Build Your Skill."

Secondary positioning:

"Trade with virtual money. Track your performance. Improve your trading discipline."

Do NOT use language suggesting:

Guaranteed profit

Guaranteed returns

Investment advice

Financial advice

Get rich

Earn money by trading

AI guarantees profits

3. TECH STACK

Use:

Frontend:

React

TypeScript

Vite

Tailwind CSS

Backend:

Supabase

PostgreSQL

Supabase Authentication

Row Level Security

Server Logic:

Supabase Edge Functions for sensitive calculations and server-side validation

Chart Library:
Use the official TradingView Lightweight Charts library.

Official GitHub repository:

https://github.com/tradingview/lightweight-charts

Official documentation:

https://tradingview.github.io/lightweight-charts/

IMPORTANT:

Use Lightweight Charts as a frontend dependency.

DO NOT self-host the TradingView Lightweight Charts repository.

DO NOT deploy the chart library on shared hosting.

Install and use the official package in the application.

4. MOBILE-FIRST DESIGN

The app will primarily be used on Android mobile devices.

Design requirements:

Mobile-first

Responsive

Premium fintech UI

Dark mode as the default interface

Modern charts

Fast loading

Large touch targets

Smooth navigation

Bottom navigation

Primary navigation:

Home

Trade

Challenges

Leaderboard

Profile

The interface should feel professional and modern.

Avoid clutter.

5. AUTHENTICATION

Implement Supabase Authentication.

Allow:

Email sign up

Email login

Google login if supported by the configured Supabase project

During signup collect:

Username

Email

Password

Username requirements:

Unique

Minimum 3 characters

Maximum 20 characters

Create a public profile automatically when a user signs up.

Profile fields:

id

username

avatar_url

created_at

level

xp

trading_skill_score

virtual_credits

virtual_balance

6. USER ONBOARDING

After signup, show a short onboarding experience.

Screen 1:

"Welcome to Paper Trading"

Text:

"Practice trading using virtual money. No real money is involved."

Screen 2:

"Build Your Trading Skill"

Text:

"Your performance is measured using consistency, risk management and trading discipline."

Screen 3:

"Start Your Trading Journey"

Button:

"Start Trading"

Require the user to accept:

"I understand that this app is for simulated trading and educational purposes only."

7. HOME DASHBOARD

Create a personalized dashboard.

Display:

Welcome message

Username

Current Level

XP progress bar

Trading Skill Score

Virtual Trading Balance

Available Trading Credits

Total simulated profit/loss

Win rate

Total trades

Add a "Continue Trading" button.

Add a Daily Reward card.

Example:

DAILY REWARD

Claim your free trading credits.

Button:

CLAIM DAILY CREDITS

Daily reward:

3 virtual trading credits.

The daily reward can only be claimed once every 24 hours.

The backend must validate this.

Do not rely only on frontend validation.

8. VIRTUAL TRADING CREDITS SYSTEM

Implement a virtual credit system.

New user receives:

5 Trading Credits.

Rule:

1 Trading Credit = permission to open one simulated trade.

When the user opens a new trade:

Deduct 1 Trading Credit.

Important:

Credits must be validated and deducted server-side.

Do NOT trust frontend calculations.

If user has:

0 Trading Credits

Show:

"You need Trading Credits to open a new trade."

Available options:

Watch Ad

Wait for Daily Reward

Do NOT automatically force the user to watch advertisements.

Rewarded advertisements must always be optional.

9. REWARDED AD PLACEHOLDER SYSTEM

Version 1.0 should create an advertisement abstraction layer.

Do NOT hardcode a specific advertising SDK if the environment does not support it yet.

Create:

RewardedAdProvider interface.

Example behavior:

When rewarded advertisement successfully completes:

Reward:

+1 Trading Credit

Important:

The reward must only be granted after a verified successful advertisement completion event.

For development mode:

Create a TEST MODE rewarded ad simulation.

Clearly label it internally as:

TEST MODE ONLY

Create backend validation hooks so the real advertising provider can later be integrated securely.

Never allow the client application to directly manipulate credit balances.

10. VIRTUAL TRADING BALANCE

Each new user receives:

$100,000 virtual balance.

This balance:

Is virtual

Has no cash value

Cannot be withdrawn

Cannot be transferred

Cannot be redeemed

Clearly display:

"Virtual Balance"

Never call this:

Wallet Balance

Never imply it represents actual money owned by the user.

11. MARKETS FOR VERSION 1.0

Do not support every market initially.

Version 1.0 should have a controlled list of supported assets.

Architecture should support expansion later.

Create asset categories:

Stocks
Crypto

Initially create a small curated asset list.

Example Stocks:

Apple

Microsoft

NVIDIA

Tesla

Amazon

Example Crypto:

Bitcoin

Ethereum

Solana

IMPORTANT:

Market data provider must be abstracted.

Create:

MarketDataProvider

Interface methods should support:

getAssets()

getLatestPrice()

getOHLC()

getHistoricalData()

Do not hardcode market data.

Use an environment configuration for API provider selection.

Create mock market data fallback for development.

12. MARKET DATA

Use a market data provider abstraction.

The chart library only displays charts.

The chart library is NOT the market data provider.

Architecture:

Market Data API

↓

Supabase Edge Function or secure server-side proxy

↓

Frontend Application

Do NOT expose private API keys in frontend code.

Never place market data API secrets directly in:

React source code

JavaScript bundles

public environment variables

Use Supabase secrets where applicable.

13. TRADE SCREEN

Create a professional trading screen.

The screen should include:

Top section:

Asset Name

Example:

Bitcoin

Symbol:

BTC/USD

Display:

Current Price

Price Change Percentage

14. CHART

Use TradingView Lightweight Charts.

Implement:

Candlestick chart.

Timeframes:

1 Minute

5 Minutes

15 Minutes

1 Hour

4 Hours

1 Day

For Version 1.0:

If real-time market data is unavailable, clearly display the correct data status.

Example:

"Market data may be delayed."

Never falsely claim:

"Live Price"

if the data is delayed.

Chart features:

Candlestick chart

Price scale

Time scale

Responsive mobile layout

Optional Version 1.0 features:

Moving Average

Volume

Do NOT overbuild advanced TradingView terminal features.

15. OPEN TRADE

Allow:

BUY

and

SELL

simulated trades.

Trade form should include:

Trade Direction:

BUY / SELL

Virtual Position Size

Stop Loss

Take Profit

Optional notes.

Before opening a trade:

Validate:

User has at least 1 Trading Credit

User has enough virtual balance

Position size is valid

Stop Loss is logically valid

Take Profit is logically valid

Important:

All critical validation must happen server-side.

When trade is successfully opened:

Deduct one Trading Credit.

Create trade record.

Store entry price.

Store timestamp.

Store position information.

16. PAPER TRADING ENGINE

Create a secure server-side paper trading engine.

Trade data should include:

Trade ID

User ID

Asset Symbol

Asset Type

Direction

Entry Price

Current Price

Exit Price

Position Size

Stop Loss

Take Profit

Status

Opened At

Closed At

Realized P&L

Unrealized P&L

Trade statuses:

OPEN

CLOSED

STOP_LOSS_HIT

TAKE_PROFIT_HIT

The backend must calculate:

Unrealized Profit/Loss

Realized Profit/Loss

Trade Result

Do NOT trust calculations performed only on the frontend.

17. CLOSE TRADE

Users should be able to manually close an open simulated trade.

When closed:

Calculate:

Exit Price

Profit/Loss

Percentage Return

Update:

Virtual Balance

Trade History

XP

Trading Statistics

18. TRADING SKILL SCORE

Create a proprietary score called:

TRADING SKILL SCORE

Range:

0 to 1000

Do NOT calculate the score based only on profit.

The score should consider:

Risk Management

Trading Consistency

Risk Reward Ratio

Maximum Drawdown

Win Rate

Average Profit/Loss

Trade Discipline

Example:

A user with:

Good risk management

and

Moderate profitability

should potentially score higher than a user who:

Made large profits but took extremely high risks.

Create an initial transparent algorithm.

Example weighting:

Risk Management: 25%

Consistency: 20%

Risk Reward Quality: 15%

Drawdown Control: 15%

Win Rate: 10%

Profitability: 10%

Trading Activity Quality: 5%

IMPORTANT:

Do NOT expose sensitive internal anti-cheating calculations directly to the client.

Create a backend function:

calculateTradingSkillScore()

The algorithm should be modular and easy to improve later.

19. XP SYSTEM

Create a gamification system.

Users earn XP for:

Opening trades

Completing trades

Completing challenges

Maintaining disciplined trading

Daily activity

Do NOT give excessive XP simply for losing money or opening unlimited trades.

Example XP:

Open Trade:

5 XP

Close Trade:

10 XP

Profitable disciplined trade:

Additional XP

Complete Challenge:

50 XP

Create Level progression.

Example:

Level 1:

Beginner

Level 2:

Learner

Level 3:

Trader

Level 4:

Skilled Trader

Level 5:

Advanced Trader

Level 6:

Expert Trader

Levels should continue beyond this.

Create a scalable XP formula.

20. DAILY CHALLENGES

Create a Daily Challenges system.

Examples:

"Complete 2 trades today."

"Maintain a positive risk/reward ratio."

"Use a stop loss in one trade."

"Complete one disciplined trade."

Avoid challenges encouraging:

Excessive trading

High-risk behavior

Gambling behavior

Reward:

XP

and optionally:

Virtual Credits.

Challenges should promote:

Risk management

Learning

Discipline

21. TRADING CHALLENGES SECTION

Create a Challenges tab.

Version 1.0 should include:

Daily Challenge

Weekly Challenge

Example challenges:

"Complete 5 disciplined trades."

"Maintain maximum drawdown below 5%."

"Achieve a positive risk/reward ratio."

"Complete a trading streak."

Do NOT promise prizes with real monetary value in Version 1.0.

Rewards should initially be:

XP

Badges

Virtual achievements

Virtual Trading Credits

22. LEADERBOARD

Create a global leaderboard.

Leaderboard ranking should NOT be based only on total profit.

Primary ranking:

Trading Skill Score

Secondary ranking:

Consistency Score

Leaderboard periods:

Daily

Weekly

All Time

Display:

Rank

Username

Level

Trading Skill Score

Do NOT display sensitive personal information.

Users should be able to hide their profile from public leaderboards through privacy settings.

23. PROFILE

Profile screen should display:

Avatar

Username

Current Level

XP

Trading Skill Score

Statistics:

Total Trades

Winning Trades

Losing Trades

Win Rate

Average Risk/Reward

Best Trade

Worst Trade

Total Simulated P&L

Maximum Drawdown

Create:

Trade History

Users can click a previous trade to see:

Asset

Direction

Entry Price

Exit Price

P&L

Date

Trade Notes

24. BADGES

Create an achievement badge system.

Example badges:

First Trade

10 Trades Completed

Disciplined Trader

Risk Manager

Consistent Trader

Challenge Winner

Create database architecture for future badges.

25. AI FEATURES – VERSION 1.0

IMPORTANT:

Do NOT build a real-money AI trading bot.

Version 1.0 AI functionality should be educational and analytical.

Create an AI Trading Assistant placeholder architecture.

Potential Version 1.0 features:

Trade Review

After a trade closes, show:

"Trade Review"

Example analysis:

Stop loss usage

Risk/reward quality

Position sizing quality

Discipline feedback

Example language:

"Your stop loss helped limit downside risk."

"This trade had a low risk/reward ratio."

Avoid:

"Buy now."

"Sell now."

"You will make profit."

"This asset will go up."

The AI assistant must be framed as:

Educational analysis

NOT financial advice.

Create a modular AI service interface so an AI API can be connected later.

For now:

Use rule-based trade analysis if an AI API is not configured.

26. AI BOT MODE – VERSION 1.0

Create an architecture placeholder for:

AI Paper Trading Bot

However, Version 1.0 should keep this feature simple.

AI Bot should:

Run only on simulated data

Use virtual balance

Never connect to a real brokerage

Never execute real trades

AI Bot modes:

Conservative

Balanced

Aggressive

Clearly display:

"Simulation Only"

AI performance should NOT be presented as guaranteed future performance.

27. AI VS USER

Do not make this the core feature.

Create it as an optional challenge mode.

User can compare:

Their Trading Skill Score

vs

AI Simulation Score

Clearly label:

"AI simulation performance does not represent guaranteed investment results."

28. TRADE HISTORY

Create a dedicated Trade History screen.

Filters:

All

Open

Closed

Profit

Loss

Asset Type

Date Range

Each trade card should show:

Asset

BUY / SELL

Entry

Exit

P&L

Status

Date

29. SEARCH

Allow users to search supported assets.

Search by:

Asset Name

Symbol

Example:

Bitcoin

BTC

Apple

AAPL

30. NOTIFICATIONS

Create notification architecture.

Version 1.0 in-app notifications:

Daily Reward Available

Challenge Completed

Level Up

Badge Earned

Trade Closed

Push notification integration can be added later.

31. DATABASE DESIGN

Create the following tables:

profiles

Fields:

id

username

avatar_url

level

xp

trading_skill_score

virtual_balance

virtual_credits

is_leaderboard_visible

created_at

updated_at

assets

Fields:

id

symbol

name

asset_type

logo_url

is_active

created_at

trades

Fields:

id

user_id

asset_id

symbol

direction

entry_price

exit_price

current_price

position_size

stop_loss

take_profit

status

realized_pnl

unrealized_pnl

opened_at

closed_at

created_at

credit_transactions

Fields:

id

user_id

transaction_type

amount

source

created_at

Examples:

SIGNUP_BONUS

DAILY_REWARD

REWARDED_AD

TRADE_COST

xp_transactions

Fields:

id

user_id

amount

reason

created_at

daily_rewards

Fields:

id

user_id

claimed_at

next_claim_at

challenges

Fields:

id

title

description

challenge_type

start_date

end_date

reward_xp

reward_credits

is_active

user_challenges

Fields:

id

user_id

challenge_id

progress

status

completed_at

badges

Fields:

id

name

description

icon

user_badges

Fields:

id

user_id

badge_id

earned_at

leaderboard_snapshots

Fields:

id

user_id

period

rank

trading_skill_score

consistency_score

created_at

32. SECURITY REQUIREMENTS

Enable Row Level Security on all user-related tables.

Users must only access:

Their profile

Their trades

Their credit history

Their XP history

Their private challenge progress

Public leaderboard data should expose only:

Username

Avatar

Level

Trading Skill Score

Never expose:

Email

Private financial information

Supabase service role key

Market data API secrets

All sensitive operations must run server-side.

33. ANTI-CHEATING

Implement basic anti-cheating protections.

The frontend must NOT directly update:

Virtual Credits

Virtual Balance

Trading Skill Score

XP

Use secure backend functions.

Examples:

openTrade()

closeTrade()

claimDailyReward()

grantRewardedAdCredit()

calculateTradingSkillScore()

All critical operations must validate:

Authenticated user.

User ownership.

Current balance.

Available credits.

Rate limits where appropriate.

34. PLAY STORE COMPLIANCE DESIGN

The app must clearly state:

"This application provides simulated paper trading only."

"No real money trading is available."

"Virtual balance and credits have no monetary value."

Do NOT include:

Deposit functionality.

Withdrawal functionality.

Broker integration.

Real-money trading execution.

Crypto wallet.

Cash redemption.

Real-money rewards in Version 1.0.

Do NOT encourage gambling.

Do NOT use:

"Win cash"

"Guaranteed earnings"

"Make money instantly"

"Guaranteed trading profit"

35. REWARDS POLICY FOR VERSION 1.0

Version 1.0 rewards must remain virtual.

Allowed Version 1.0 rewards:

XP

Levels

Badges

Virtual Trading Credits

Leaderboard position

Do NOT implement:

Cash rewards

Crypto rewards

Withdrawable rewards

Gift cards

Financial prizes

in Version 1.0.

Create the system so rewards can be expanded later only after separate legal and platform-policy review.

36. AD SYSTEM

Version 1.0 monetization:

Rewarded advertisements.

Users can voluntarily watch a rewarded advertisement.

Reward:

+1 Virtual Trading Credit.

Do NOT force advertisements after every trade.

Do NOT interrupt trading execution with advertisements.

Do NOT use advertisements in a way that pressures users to trade excessively.

Create clean ad placement areas for future:

Banner ads

Native ads

Interstitial ads

But keep them disabled by default until a real ad provider is configured.

37. FUTURE SUBSCRIPTION ARCHITECTURE

Do NOT activate subscriptions in Version 1.0.

However, create feature flags for future premium functionality.

Potential future premium benefits:

Ad-free experience

More daily trading credits

Advanced AI Trade Review

Advanced performance analytics

Advanced challenges

Additional chart indicators

Advanced Trading Journal

Unlimited trade simulations subject to fair-use limits

For Version 1.0:

Do NOT show pricing.

Do NOT create payment functionality.

38. SETTINGS

Create Settings.

Include:

Profile Settings

Change Username

Avatar

Dark Mode

Notification Preferences

Leaderboard Privacy

Delete Account

Data Privacy

Terms of Service

Privacy Policy

Educational Disclaimer

39. REQUIRED LEGAL SCREENS

Create placeholder pages for:

Privacy Policy

Terms of Service

Educational Disclaimer

Risk Disclaimer

The disclaimer must clearly state:

"This application is intended for educational and simulation purposes only."

"Nothing in this application constitutes financial or investment advice."

"Past simulated performance does not guarantee future results."

"Virtual currency and credits have no monetary value."

40. EMPTY STATES

Create polished empty states.

Examples:

No Trades Yet

"Your trading journey starts here."

Button:

Start Trading

No Challenges:

"New challenges are coming soon."

No Search Results:

"No assets found."

41. ERROR HANDLING

Create professional error handling.

Examples:

Market data unavailable:

"Market data is temporarily unavailable. Please try again later."

Trade validation failure:

"Unable to open this simulated trade. Please check your trading parameters."

Network failure:

"Connection lost. Please check your internet connection."

Never expose:

Raw database errors.

API secrets.

Internal stack traces.

42. PERFORMANCE REQUIREMENTS

Optimize for:

Fast mobile loading.

Lazy loading.

Efficient chart rendering.

Minimal unnecessary API requests.

Do not continuously fetch prices when the user is not viewing a relevant screen.

Implement:

Caching where appropriate.

Debouncing.

Loading skeletons.

Avoid excessive Supabase queries.

43. DESIGN SYSTEM

Create a consistent design system.

Visual direction:

Premium

Modern

Professional

Fintech

Dark

Avoid:

Casino-style visuals.

Excessive flashing animations.

Gambling-like slot-machine designs.

Use:

Cards

Subtle gradients

Clean typography

Professional charts

Rounded UI elements

Consistent spacing

44. BOTTOM NAVIGATION

Create five main tabs:

HOME

TRADE

CHALLENGES

LEADERBOARD

PROFILE

The navigation should be optimized for one-handed mobile usage.

45. VERSION 1.0 PRIORITY

The development priority order must be:

PHASE 1:

Authentication

Profiles

Database

Security

PHASE 2:

Assets

Market Data Provider

TradingView Lightweight Charts

PHASE 3:

Paper Trading Engine

Open Trade

Close Trade

P&L Calculation

PHASE 4:

Trading Credits

Daily Rewards

XP

Levels

PHASE 5:

Trading Skill Score

Trade History

Profile Statistics

PHASE 6:

Challenges

Badges

Leaderboard

PHASE 7:

Rewarded Advertisement Architecture

PHASE 8:

AI Trade Review

Rule-based analysis initially

46. IMPORTANT DEVELOPMENT RULES

Before building each feature:

Check existing database architecture.

Avoid duplicate database tables.

Avoid duplicate functionality.

Reuse existing components.

Keep the architecture modular.

Do NOT create fake backend functionality.

If a required API key or service is missing:

Create the integration architecture.

Use clearly labeled mock data for development.

Do NOT pretend the feature is live.

47. FINAL PRODUCT REQUIREMENTS

The completed Version 1.0 application must allow a user to:

✓ Create an account

✓ Receive 5 initial Trading Credits

✓ Receive a $100,000 Virtual Balance

✓ Claim 3 daily Trading Credits

✓ Browse supported assets

✓ Search assets

✓ View professional candlestick charts

✓ Open BUY simulated trades

✓ Open SELL simulated trades

✓ Configure stop loss

✓ Configure take profit

✓ Close simulated trades

✓ View simulated P&L

✓ View Trade History

✓ Earn XP

✓ Level up

✓ Receive a Trading Skill Score

✓ Complete trading challenges

✓ Earn badges

✓ View leaderboard

✓ Earn virtual credits from optional rewarded advertisements

✓ View educational trade reviews

✓ Use the application entirely without real-money trading

48. FINAL DEVELOPMENT INSTRUCTION

Build the application as a real working product.

Do NOT create only static UI screens.

Implement:

Real database integration.

Authentication.

Secure backend operations.

Row Level Security.

Working trade simulation logic.

Working XP system.

Working virtual credit system.

Working leaderboard architecture.

Working challenges.

Use mock market data only when a real Market Data API has not been configured.

Clearly separate:

Development mode

Production mode.

Do not implement real-money trading under any circumstances.

The app must remain a paper trading and trading skill simulation platform.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://skilltrade-playground.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/01a23b15-a2d6-4d42-8adf-10aa7047f8d3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
