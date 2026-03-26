# Credit Card Chris - Feature Specifications

Complete feature-by-feature implementation guide for rebuilding from scratch. Each section is a self-contained feature spec.

---

## 1. Authentication

### What it does
Email/password signup + Google OAuth. Email confirmation required for new signups. Middleware guards protected routes and redirects authenticated users away from auth pages.

### Routes
- `/login` — Email/password form + "Sign in with Google" button
- `/signup` — Registration form + "Sign up with Google" button
- `/auth/callback` — OAuth callback route (exchanges code for session)

### Implementation
- Supabase Auth with `@supabase/ssr`
- Server client in `src/lib/supabase/server.ts` uses `createServerClient` with cookie-based sessions
- Client in `src/lib/supabase/client.ts` uses `createBrowserClient`
- Middleware (`src/lib/supabase/middleware.ts`) runs `updateSession()` on every request
- CRITICAL: Always `getUser()` never `getSession()` — getSession reads from untrusted cookies

### Protected routes
`/dashboard`, `/wallet`, `/transactions`, `/recommend`, `/settings`, `/goals`, `/insights`, `/chat`, `/budgets`, `/compare`, `/applications`, `/subscriptions`, `/transfer`

### Auth routes (redirect to /dashboard if logged in)
`/login`, `/signup`

---

## 2. Landing Page

### What it does
Marketing page with hero section, feature highlights, testimonials, and pricing tiers.

### Route
`/` (root page)

### Pricing tiers
- **Free:** Track cards, log transactions, category recommendations, CSV import/export, goals tracking, spending budgets
- **Premium ($9.99/mo or $99/yr):** AI rewards assistant, bank sync (Plaid), advanced analytics, priority support

### Also includes
- OG image generator (`opengraph-image.tsx`)
- `robots.ts` and `sitemap.ts` for SEO

---

## 3. Dashboard

### What it does
Main overview showing spending/rewards charts, top merchants, month-over-month comparison, budget alerts, and a getting-started checklist for new users.

### Route
`/dashboard`

### Components
- **Spending chart** — Stacked bar chart by category (recharts)
- **Rewards chart** — Rewards earned by card
- **Monthly chart** — Year-over-year monthly spending comparison
- **Top merchants** — Most-spent-at merchants
- **MoM comparison** — This month vs last month totals
- **Budget alerts widget** — Shows categories approaching/exceeding budget
- **Getting started checklist** — Appears for new users (add cards, log transactions, set budgets, create goals)

### Data
Loads last 6 months of transactions. Groups by category, card, merchant, and month.

---

## 4. Wallet (Card Management)

### What it does
Users add credit cards from 104+ pre-built templates or create custom cards. Cards can be nicknamed, reordered via drag-and-drop, and archived. Each card shows its reward structure by category.

### Route
`/wallet`

### Components
- **Card list** — Grid/list view, drag-to-reorder (updates `sort_order`), grouping by issuer
- **Add card dialog** — Search/filter templates by issuer/network, or create custom card (name, issuer, network, reward_type, reward_unit, base_rate, color)
- **Card detail sheet** — Edit rewards per category, set nickname, set annual_fee_date, set points_expiration_date, delete card
- **Credit card visual** — Card-shaped UI component with name, issuer, last four, network logo, colored background
- **Statement credits** — Track annual credits per card (e.g., "$200 Uber credit"). Each has name, annual_amount, used_amount, reset_month
- **Spend challenge widget** — Welcome bonus progress tracker

### Card template fields
name, issuer, network, annual_fee, reward_type (points|cashback|miles), reward_unit (e.g., "Ultimate Rewards"), base_reward_rate, color

### Custom card fields (when no template)
custom_name, custom_issuer, custom_network, custom_reward_type, custom_reward_unit, custom_base_reward_rate, custom_color

### Flexible cards
Some cards (Citi Custom Cash, US Bank Cash+, BoA Customized Cash Rewards) let users select their 5x category. Users set this via custom reward overrides.

---

## 5. Transactions

### What it does
CRUD for spending transactions. Supports filtering by card, category, date range, and merchant search. CSV import/export. Automatic rewards calculation on save.

### Route
`/transactions`

### Components
- **Transaction list** — Table with sort, filter (card, category, date range), merchant search
- **Add transaction dialog** — Card picker, category picker, amount, merchant, date, description, transaction_type
- **Edit transaction dialog** — Same fields, pre-populated
- **Import CSV dialog** — Upload CSV, map columns to fields, preview, bulk insert

### Transaction types
`expense` | `income` | `refund` | `transfer`

### Refund status
`pending` | `received` | `null`

### Rewards calculation
When saving a transaction, calculate `rewards_earned` using the card's multiplier for the selected category (see reward fallback chain in CLAUDE.md).

### CSV format
Headers: date, merchant, amount, category, card, description. Uses papaparse for parsing.

---

## 6. Card Recommendation Tool

### What it does
User selects a spending category, and the app ranks their cards by reward multiplier for that category. Premium users can also type a purchase description and AI classifies it into a category.

### Route
`/recommend`

### Logic
1. User selects category (or types purchase description for AI classification)
2. App calls `rankCardsForCategory(userCards, categoryId)` — sorts active cards by multiplier descending
3. Shows ranked list with multiplier, reward unit, and break-even spend

### AI classification (premium)
POST `/api/recommend-ai` with purchase text. Claude Haiku classifies into one of the 14 categories. Returns category name.

### Break-even formula
`annualFee / ((multiplier - 1) * 0.01)` — how much you need to spend annually in this category to justify the card's annual fee.

---

## 7. Goals

### What it does
Users set rewards targets (e.g., "500,000 points for Hawaii trip by December"). Progress bar shows current vs target.

### Route
`/goals`

### Fields
name, target_points (integer), target_date (optional), is_active (boolean)

### Progress calculation
Sum all `rewards_earned` from user's transactions. Show as percentage of target_points.

---

## 8. Settings

### What it does
Account management: profile info, referral link, theme toggle, sign out, spending budgets, push notification toggle, connected Plaid accounts, subscription management.

### Route
`/settings`

### Sub-features
- **Profile** — Display name, email (read-only)
- **Referral link** — Generated from user ID: `user.id.replace(/-/g, "").slice(0, 8).toUpperCase()`. Shareable URL: `creditcardchris.com/u/[CODE]`
- **Theme toggle** — Dark/light mode (next-themes). Currently dark-only
- **Spending budgets** — CRUD monthly limits per category, optional rollover
- **Push notifications toggle** — Subscribe/unsubscribe to web push
- **Connected accounts** — Plaid linked bank accounts (premium). Link/unlink
- **Subscription card** — Current plan, upgrade CTA, Stripe portal link
- **Sign out** — `supabase.auth.signOut()`

---

## 9. Spending Budgets

### What it does
Monthly spending limits per category. Shows progress bar of spent vs limit. Rollover optionally carries unused budget to next month.

### Route
`/budgets` (also in settings)

### Fields
category_id, monthly_limit, rollover_enabled, rollover_amount

### Alert system
Daily cron (`/api/push/budget-alerts`) checks if any category's spending exceeds its monthly_limit. Sends push notification if over budget.

---

## 10. Insights / Analytics

### What it does
Detailed spending analytics dashboard. 6-month history, category breakdowns, trends.

### Route
`/insights`

### Features
- Category spending breakdown (bar/pie charts)
- Monthly spending trends (line chart)
- Year-over-year comparison
- Top merchants
- Rewards earned over time

---

## 11. AI Chat Assistant (Premium)

### What it does
Conversational AI that answers questions about the user's cards, spending, and rewards. Streams responses.

### Route
`/chat`

### API
POST `/api/chat` — Streaming response from Claude Haiku.

### System prompt context
Includes user's: cards (names, multipliers), last 30 days transactions (amounts, merchants, categories), budgets, total rewards earned.

### Premium check
Queries `subscriptions` table for `plan === "premium"`. Returns 403 if not premium.

---

## 12. Card Comparison

### What it does
Compare 2+ cards side-by-side across all spending categories. Shows multiplier per category for each selected card.

### Route
`/compare`

### UI
Table with categories as rows, selected cards as columns. Highlights the best multiplier per category.

---

## 13. Card Application Tracker

### What it does
Track credit card applications: which cards you applied for, status, bonus offers, credit score used.

### Route
`/applications`

### Fields
card_name, issuer, applied_date, status (pending|approved|denied|cancelled), bonus_offer, annual_fee, credit_score_used, notes

---

## 14. Subscription Tracker

### What it does
Track recurring subscriptions (Netflix, Spotify, etc.). Know which card is charging each subscription and get price change alerts.

### Route
`/subscriptions`

### Fields
merchant, category, card_id, amount, billing_cycle (monthly|annual), last_charged_at, next_charge_at, price_alert_enabled, previous_amount, is_active

---

## 15. Transfer Partner Calculator

### What it does
Look up transfer partner ratios for points programs (Chase, Amex, Citi, Capital One, Bilt, Wells Fargo). Calculate how many miles/points you'd get from a transfer.

### Route
`/transfer`

### Data
Static constants in `src/lib/constants/transfer-partners.ts`. Each issuer has a list of partners with name, ratio (e.g., "1:1", "250:200"), and type (airline|hotel).

### Partners by program
- **Chase:** United, Southwest, British Airways, Air France/KLM, Singapore, Korean Air, Aer Lingus, Iberia, Virgin Atlantic, Hyatt, IHG, Marriott
- **Amex:** Delta, British Airways, Air France/KLM, Singapore, ANA, Avianca, Cathay, Emirates, Etihad, Hawaiian, Iberia, JetBlue, Hilton, Marriott, Choice
- **Citi:** Avianca, Turkish, Singapore, Air France/KLM, Cathay, ANA, Etihad, Eva Air, Qantas, Thai, IHG, Wyndham
- **Capital One:** Air Canada, Avianca, British Airways, Cathay, Finnair, Air France/KLM, Singapore, TAP, Turkish, Wyndham, Choice
- **Bilt:** Alaska, American, Air Canada, Air France/KLM, British Airways, Cathay, Emirates, Singapore, Turkish, United, Virgin Atlantic, Hyatt, IHG, Marriott
- **Wells Fargo:** Air France/KLM, Avianca, British Airways, Iberia, Turkish

---

## 16. Plaid Bank Sync (Premium)

### What it does
Link bank accounts via Plaid to automatically import transactions from 12,000+ financial institutions.

### API routes
- POST `/api/plaid/create-link-token` — Initialize Plaid Link (premium check)
- POST `/api/plaid/exchange-token` — Exchange public token, store access_token + item_id, fetch accounts
- GET `/api/plaid/accounts` — List linked accounts
- POST `/api/plaid/sync` — Sync new transactions using cursor-based pagination
- POST `/api/plaid/disconnect` — Remove Plaid item and accounts

### Tables
- `plaid_items` — access_token, item_id, institution_name, cursor, last_synced_at
- `plaid_accounts` — plaid_account_id, name, official_name, type, subtype, mask

### Security
- Access tokens stored server-side only
- Premium subscription required
- Uses PLAID_CLIENT_ID + PLAID_SECRET

---

## 17. Stripe Subscriptions

### What it does
Manages premium subscription lifecycle. Checkout, billing portal, webhook event handling.

### API routes
- POST `/api/stripe/create-checkout` — Create Stripe Checkout session
- POST `/api/stripe/portal` — Redirect to Stripe billing portal
- POST `/api/stripe/webhook` — Handle subscription events

### Webhook events handled
- `checkout.session.completed` — Create/update subscription record
- `customer.subscription.updated` — Update plan/status/period_end
- `customer.subscription.deleted` — Set plan to "free"

### Subscription table
`subscriptions` — user_id, stripe_customer_id, stripe_subscription_id, plan (free|premium), status, current_period_end

---

## 18. Email Digest

### What it does
Weekly email summarizing spending for the past 7 days.

### Route
GET/POST `/api/digest` (cron: Monday 9am UTC)

### Content
- Total spent this week
- Total rewards earned
- Transaction count
- Uses Resend for delivery
- Requires CRON_SECRET authorization header

---

## 19. Push Notifications

### What it does
Web push notifications for budget overage and annual fee reminders.

### API routes
- POST/DELETE `/api/push/subscribe` — Register/unregister push subscription
- POST `/api/push/send` — Manual push (requires CRON_SECRET)
- POST `/api/push/annual-fee-alerts` — Cron daily 8am UTC: sends reminders 30/7/1 days before annual_fee_date
- POST `/api/push/budget-alerts` — Cron daily 9am UTC: sends alert if category spending exceeds monthly_limit

### Service worker
`public/sw.js` handles push events, displays notification, routes notification click to `/dashboard`

### Setup
Requires VAPID key pair (NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY). Auto-cleans expired subscriptions from DB.

---

## 20. Public Referral Profile

### What it does
Shareable public page showing user's stats and achievement badges.

### Route
`/u/[code]` — where code is the referral code

### Content
- Display name
- Member since date
- Card count
- Total rewards earned
- Achievement badges:
  - "Power User" — 5+ cards
  - "Multi-card optimizer" — 3+ cards
  - "100k+ points" — total rewards >= 100,000
  - "500k+ points" — total rewards >= 500,000

### Data source
`public_profiles` table (public SELECT policy). Updated from settings page.

---

## 21. Onboarding Flow

### What it does
New user setup wizard that guides through adding first card, understanding the app, and configuring basics.

### Component
`src/components/onboarding/onboarding-flow.tsx`

### Steps
1. Welcome / overview
2. Add your first card
3. Set up spending categories of interest
4. (Optional) Set a rewards goal

---

## 22. Command Palette

### What it does
Global Cmd+K search across pages, cards, and transactions.

### Component
`src/components/layout/command-palette.tsx`

### Search targets
- Navigation pages (dashboard, wallet, transactions, etc.)
- User's cards (by name)
- Recent transactions (by merchant)

### Library
Uses `cmdk` package.

---

## 23. Statement Credits

### What it does
Track annual statement credits per card (e.g., "$200 dining credit on Amex Gold").

### Component
`src/components/wallet/statement-credits.tsx`

### Fields
name, annual_amount, used_amount, reset_month (1-12)

### Logic
Shows remaining credit (annual_amount - used_amount). Resets when current month reaches reset_month.

---

## 24. Spending Categories

### Reference data
14 categories, each with name, display_name, and lucide icon:

| Name | Display | Icon |
|------|---------|------|
| dining | Dining | utensils |
| travel | Travel | plane |
| groceries | Groceries | shopping-cart |
| gas | Gas Stations | fuel |
| streaming | Streaming | tv |
| online_shopping | Online Shopping | globe |
| transit | Transit & Rideshare | bus |
| drugstores | Drugstores | pill |
| home_improvement | Home Improvement | hammer |
| entertainment | Entertainment | ticket |
| hotels | Hotels | bed-double |
| flights | Flights | plane-takeoff |
| car_rental | Car Rental | car |
| other | Everything Else | circle-dot |

### Category colors
dining: #ef4444, travel: #3b82f6, groceries: #22c55e, gas: #f59e0b, streaming: #8b5cf6, online_shopping: #06b6d4, transit: #64748b, drugstores: #ec4899, home_improvement: #78716c, entertainment: #a855f7, hotels: #0ea5e9, flights: #3b82f6, car_rental: #14b8a6, other: #9ca3af

---

## 25. Card Templates

### What it does
104+ pre-built credit card definitions with accurate reward structures, annual fees, and issuers. Populated via SQL migration files.

### Key cards include
Chase Sapphire Preferred/Reserve, Freedom Unlimited/Flex, Ink Business Preferred/Cash/Unlimited, Amex Gold/Platinum/Green/Blue Cash/EveryDay, Capital One Venture X/Venture/SavorOne/Savor/Quicksilver, Citi Double Cash/Premier/Custom Cash/Strata Premier, Discover it/it Miles, Wells Fargo Active Cash/Autograph, Bank of America Premium Rewards/Customized Cash/Unlimited Cash, US Bank Altitude Reserve/Connect/Cash+, Bilt Mastercard, and many more.

### Reward examples
- Chase Sapphire Preferred: 3x dining, 3x streaming, 3x online shopping, 2x travel
- Chase Sapphire Reserve: 3x dining, 3x travel, 10x hotels, 5x flights
- Amex Gold: 4x dining, 4x groceries, 3x flights
- Amex Platinum: 5x flights, 5x hotels
- Capital One Venture X: 2x everything, 5x flights, 10x hotels/car rental

---

## Database Migration Order

Run these SQL files in this exact order in the Supabase SQL editor:

1. `supabase/migrations/001_initial_schema.sql` — Core tables + RLS
2. `supabase/seed.sql` — Categories + initial 12 card templates + rewards
3. `supabase/add_goals_credits_sorting.sql` — Goals, statement credits, sort_order
4. `supabase/add_budgets_annual_fees.sql` — Budgets, public profiles, annual_fee_date
5. `supabase/add_applications_expiration.sql` — Applications, points_expiration_date
6. `supabase/add_push_subscriptions.sql` — Push subscriptions
7. `supabase/add_cards.sql` — Card batch 1
8. `supabase/add_cards_2.sql` — Card batch 2
9. `supabase/add_cards_3.sql` — Card batch 3
10. `supabase/add_cards_4.sql` — Card batch 4
11. `supabase/add_cards_5.sql` — Card batch 5
12. `supabase/fix_flexible_card_categories.sql` — Fix flexible card rewards

---

## Security Improvements for Rebuild

Things to do better in the new app:

1. **Input validation** — Add Zod schemas for all form inputs and API request bodies
2. **Rate limiting** — Add rate limiting to API routes (especially auth, chat, recommend-ai)
3. **CSRF protection** — Verify origin headers on mutation API routes
4. **Content Security Policy** — Add CSP headers via next.config
5. **API route auth** — Create a shared auth middleware for API routes instead of checking auth inline
6. **Plaid token storage** — Consider encrypting access_tokens at rest
7. **Error handling** — Don't leak internal error details to client
8. **Audit logging** — Log sensitive operations (subscription changes, account deletions)
9. **Type safety** — Use Supabase generated types instead of manual interfaces
10. **Environment validation** — Validate all env vars at startup (fail fast)
