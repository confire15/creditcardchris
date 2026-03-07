# Credit Card Chris - CLAUDE.md

## Project Overview

Credit card rewards tracking app. Users add cards to their wallet, log transactions, and the app recommends the best card for each spending category. Premium tier adds AI chat, Plaid bank sync, and advanced analytics.

- **Domain:** creditcardchris.com
- **Hosting:** Vercel (auto-deploys on push to main)
- **Database:** Supabase (PostgreSQL + Row Level Security)

## Tech Stack

- **Framework:** Next.js 14+ App Router, TypeScript, React 19
- **Database/Auth:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **UI:** shadcn/ui (Radix UI + Tailwind CSS v4), lucide-react icons
- **Charts:** recharts
- **Toasts:** sonner
- **Command palette:** cmdk
- **Dates:** date-fns
- **CSV:** papaparse
- **Payments:** Stripe (subscriptions)
- **Bank sync:** Plaid
- **AI:** Anthropic Claude (claude-haiku-4-5-20251001)
- **Email:** Resend
- **Push:** web-push (VAPID)
- **Themes:** next-themes

## Security Rules (CRITICAL)

### Authentication
- ALWAYS use `supabase.auth.getUser()`, NEVER `getSession()` — `getSession()` reads from cookies which can be spoofed
- Server components: `createClient()` from `@/lib/supabase/server`
- Client components: `createClient()` from `@/lib/supabase/client`
- Middleware refreshes auth tokens on every request via `updateSession()`
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`) is ONLY used in server-side API routes (cron jobs, webhooks) — never expose to client

### Row Level Security
- Every user-scoped table MUST have RLS enabled with policies scoped to `auth.uid() = user_id`
- Tables with indirect ownership (e.g., `user_card_rewards`) scope through parent: `EXISTS (SELECT 1 FROM user_cards WHERE user_cards.id = ... AND user_cards.user_id = auth.uid())`
- Reference tables (`spending_categories`, `card_templates`, `card_template_rewards`) are public SELECT only
- `public_profiles` is public SELECT, user-scoped INSERT/UPDATE/DELETE

### API Route Security
- Cron job routes (digest, push alerts) require `Authorization: Bearer ${CRON_SECRET}` header
- Stripe webhook route verifies signature with `stripe.webhooks.constructEvent()`
- Premium-only routes (chat, recommend-ai, plaid) check `subscriptions.plan === "premium"` before proceeding
- Never expose API keys or service role keys in client-side code

### Input Validation
- Validate all user input server-side before database operations
- Use parameterized queries (Supabase client handles this)
- Sanitize merchant/description fields in transactions

## Project Structure

```
src/app/
  layout.tsx                 — Root layout (ThemeProvider, fonts, PWA manifest)
  page.tsx                   — Landing page (hero, features, pricing)
  (auth)/
    login/page.tsx           — Email/password + Google OAuth
    signup/page.tsx           — Registration (requires email confirmation)
    auth/callback/route.ts   — OAuth callback handler
  (dashboard)/
    layout.tsx               — Auth guard + sidebar + mobile nav + command palette
    dashboard/page.tsx       — Main dashboard (charts, insights, MoM comparison)
    wallet/page.tsx          — Card management (add, edit, reorder, archive)
    transactions/page.tsx    — Transaction list (filters, search, CRUD)
    recommend/page.tsx       — Best card for category
    goals/page.tsx           — Rewards goals tracking
    settings/page.tsx        — Account settings, budgets, connected accounts
    insights/page.tsx        — Detailed spending analytics
    chat/page.tsx            — AI rewards assistant (premium)
    budgets/page.tsx         — Monthly spending limits
    compare/page.tsx         — Side-by-side card comparison
    applications/page.tsx    — Card application tracker
    subscriptions/page.tsx   — Recurring subscription tracker
    transfer/page.tsx        — Transfer partner calculator
  api/
    digest/route.ts          — Weekly email summary (cron: Monday 9am UTC)
    chat/route.ts            — AI streaming endpoint (premium)
    recommend-ai/route.ts    — AI category classification (premium)
    stripe/
      webhook/route.ts       — Subscription lifecycle
      create-checkout/route.ts
      portal/route.ts
    plaid/
      create-link-token/route.ts
      exchange-token/route.ts
      accounts/route.ts
      sync/route.ts
      disconnect/route.ts
    push/
      subscribe/route.ts     — Register/unregister push subscription
      send/route.ts          — Manual push (requires CRON_SECRET)
      annual-fee-alerts/route.ts  — Cron: daily 8am UTC
      budget-alerts/route.ts      — Cron: daily 9am UTC
  u/[code]/page.tsx          — Public referral profile page

src/components/
  layout/                    — Sidebar, mobile-nav, command-palette, notifications-bell
  dashboard/                 — Dashboard charts, widgets, getting-started checklist
  wallet/                    — Card list, add/edit dialogs, card visual, statement credits
  transactions/              — Transaction list, add/edit/import-csv dialogs
  goals/                     — Goals list
  settings/                  — Settings content, budgets, push toggle, connected accounts, subscription card
  recommend/                 — Recommend tool
  compare/                   — Card comparison
  applications/              — Application tracker
  chat/                      — Chat interface (streaming)
  insights/                  — Insights dashboard
  subscriptions/             — Subscription tracker
  transfer/                  — Transfer partner calculator
  onboarding/                — New user setup wizard

src/lib/
  supabase/
    client.ts                — Browser client (createBrowserClient)
    server.ts                — Server client (createServerClient with cookie handling)
    middleware.ts            — Auth middleware (updateSession, route guards)
  types/database.ts          — All TypeScript interfaces
  utils/
    rewards.ts               — Reward calculation, card ranking, card name/color helpers
    format.ts                — Currency, number, date formatting
    utils.ts                 — cn() helper (clsx + tailwind-merge)
  constants/
    categories.ts            — Category icons (lucide) and colors (hex)
    transfer-partners.ts     — Transfer partner ratios by issuer

supabase/
  migrations/001_initial_schema.sql  — Core tables + RLS
  seed.sql                           — Categories + initial card templates + rewards
  add_goals_credits_sorting.sql      — Goals, statement credits, sort_order
  add_budgets_annual_fees.sql        — Budgets, public profiles, annual_fee_date
  add_applications_expiration.sql    — Applications, points_expiration_date
  add_push_subscriptions.sql         — Push subscriptions
  add_cards.sql through add_cards_5.sql  — 104+ card templates
  fix_flexible_card_categories.sql   — Flexible card category fixes
```

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          # Server-side only (cron, webhooks)

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET

# Anthropic
ANTHROPIC_API_KEY

# Plaid
PLAID_CLIENT_ID
PLAID_SECRET
PLAID_ENV                          # sandbox | development | production

# Email
RESEND_API_KEY

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY

# Cron Auth
CRON_SECRET
```

## Database Schema

### Reference Tables (public read)
- `spending_categories` — 14 categories: dining, travel, groceries, gas, streaming, online_shopping, transit, drugstores, home_improvement, entertainment, hotels, flights, car_rental, other
- `card_templates` — 104+ pre-built card definitions (name, issuer, network, annual_fee, reward_type, reward_unit, base_reward_rate, color)
- `card_template_rewards` — Multipliers per template per category (with optional cap_amount). UNIQUE(card_template_id, category_id)

### User Tables (RLS: auth.uid() = user_id)
- `user_cards` — User's wallet. Supports template cards OR custom cards (custom_name, custom_issuer, etc.). Has nickname, last_four, sort_order, annual_fee_date, points_expiration_date
- `user_card_rewards` — Custom reward rate overrides per card per category. UNIQUE(user_card_id, category_id). RLS scoped through user_cards ownership
- `transactions` — Spending history. Fields: amount, merchant, description, transaction_date, transaction_type (expense|income|refund|transfer), refund_status, rewards_earned, plaid_transaction_id, is_pending
- `rewards_goals` — Target points + target date + active toggle
- `statement_credits` — Annual credits per card (name, annual_amount, used_amount, reset_month). RLS scoped through user_id
- `spending_budgets` — Monthly limit per category. UNIQUE(user_id, category_id). Optional rollover
- `card_applications` — Status: pending|approved|denied|cancelled. Tracks bonus_offer, annual_fee, credit_score_used
- `push_subscriptions` — Web push endpoint + keys. UNIQUE(user_id, endpoint)
- `public_profiles` — Shareable profile (referral_code UNIQUE, display_name, member_since, cards_count, total_rewards)
- `plaid_items` — Plaid access tokens + institution info + sync cursor
- `plaid_accounts` — Linked bank accounts
- `subscriptions` — Stripe subscription status (plan: free|premium)
- `tracked_subscriptions` — Recurring charges (merchant, amount, billing_cycle, price alerts)

### All tables use UUID primary keys with `gen_random_uuid()`

## Key Patterns

### Reward Calculation (IMPORTANT)
Multiplier fallback chain — always check in this order:
1. User's custom reward override (`user_card_rewards`)
2. Card template reward (`card_template_rewards`)
3. Card's base reward rate (`card_template.base_reward_rate` or `custom_base_reward_rate`)

Formula: `rewards = Math.round(amount * multiplier * 100) / 100`

### Card Name Resolution
`nickname > card_template.name > custom_name > "Unknown Card"`

### Card Color Resolution
`card_template.color > custom_color > "#d4621a"` (primary orange)

### Break-Even Formula
`annualFee / ((multiplier - 1) * 0.01)` — annual spending needed to offset annual fee

### CPP (Cents Per Point)
Default 1.5 cpp. Value formula: `(projectedRewards * cppValue) / 100`

### Referral Code
`user.id.replace(/-/g, "").slice(0, 8).toUpperCase()`

### Formatting
- Currency: `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`
- Dates: `date-fns` format "MMM d, yyyy" and "MMM d"

## Styling Conventions

- Tailwind CSS v4 with dark theme (dark-only currently)
- Primary color: orange `#d4621a`
- Dark background: `#0f1117`
- Border opacity: `border-white/[0.06]`
- Hover bg: `bg-primary/[0.08]`
- Card radius: `rounded-2xl`
- Component shadows: `shadow-md shadow-primary/20`
- All UI components from shadcn/ui (Radix primitives)
- Icons from lucide-react

## Cron Jobs (vercel.json)

- `/api/digest` — Monday 9am UTC (weekly email summary)
- `/api/push/budget-alerts` — Daily 9am UTC
- `/api/push/annual-fee-alerts` — Daily 8am UTC

## Premium Tier

- Price: $9.99/month or $99/year (17% savings)
- Features gated behind `subscriptions.plan === "premium"`:
  - AI chat assistant (Claude Haiku)
  - AI purchase category classification
  - Plaid bank sync
- Managed through Stripe Checkout + Customer Portal
- Webhook handles: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted

## PWA

- Manifest at `public/manifest.json`
- Service worker at `public/sw.js` handles push notifications
- Icons: 192x192, 512x512
- Theme color: `#d4621a`
- Standalone display mode

## User Preferences

- Implement everything in batches without asking for confirmation on each item
- Short, concise responses
- No emojis unless explicitly asked
