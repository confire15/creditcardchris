# Credit Card Chris - CLAUDE.md

## Project Overview

Credit card rewards app for points enthusiasts (5-10+ cards). The core value prop: **"Which card should I use right now?" — answered in 2 seconds.**

MVP has exactly 3 features:
1. **Best Card Finder** — the home screen. Tap a category → see cards ranked by reward rate.
2. **Wallet** — add/manage cards from 104+ templates. Drag to reorder, archive, custom reward overrides.
3. **Statement Credit Tracker** — per-card credits with progress bars and reset tracking.

Everything else (transactions, budgets, goals, AI chat, insights, applications, Plaid sync, transfer partners, subscriptions tracker) is intentionally cut. Do not add these back without discussion.

- **Domain:** creditcardchris.com
- **Hosting:** Vercel (auto-deploys on push to main)
- **Database:** Supabase (PostgreSQL + Row Level Security)

## Post-MVP Roadmap (defer these until traction proven)

| Priority | Feature | Trigger |
|----------|---------|---------|
| v1.1 | Push notifications for credit resets | After 100 users with credits tracked |
| v1.1 | iOS/Android home screen widget | After validating core usage |
| v1.2 | Plaid bank sync + auto transaction import | Premium, after free tier retention proven |
| v1.2 | Spending insights | Only with Plaid data, never manual |
| v1.3 | AI category detection | Premium, after Plaid |
| v2.0 | Native app (React Native/Expo) | If PWA traction proves mobile-first need |

## Tech Stack

- **Framework:** Next.js 14+ App Router, TypeScript, React 19
- **Database/Auth:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **UI:** shadcn/ui (Radix UI + Tailwind CSS v4), lucide-react icons
- **Toasts:** sonner
- **Dates:** date-fns
- **Payments:** Stripe (subscriptions)
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

### API Route Security
- Cron job routes require `Authorization: Bearer ${CRON_SECRET}` header
- Stripe webhook route verifies signature with `stripe.webhooks.constructEvent()`
- Premium-only routes check `subscriptions.plan === "premium"` before proceeding
- Never expose API keys or service role keys in client-side code

### Input Validation
- Validate all user input server-side before database operations
- Use parameterized queries (Supabase client handles this)

## Project Structure

```
src/app/
  layout.tsx                 — Root layout (ThemeProvider, fonts, PWA manifest)
  page.tsx                   — Landing page (one pain point, one CTA)
  (auth)/
    login/page.tsx           — Email/password + Google OAuth
    signup/page.tsx          — Registration
    auth/callback/route.ts   — OAuth callback handler
  (dashboard)/
    layout.tsx               — Auth guard + top nav (desktop) + bottom nav (mobile)
    dashboard/page.tsx       — Dashboard with savings overview, expiring credits, annual fees total, my cards
    best-card/page.tsx       — Best Card Finder (RecommendTool). THE core feature.
    wallet/page.tsx          — Card management (add, reorder, archive)
    benefits/page.tsx        — Statement credits tracker with log usage
    settings/page.tsx        — Account, subscription, push notifications, sign out
    onboarding/page.tsx      — New user card setup wizard. Redirects to /best-card after setup.
  api/
    digest/route.ts          — Weekly email summary (cron: Monday 9am UTC)
    stripe/
      webhook/route.ts       — Subscription lifecycle
      create-checkout/route.ts
      portal/route.ts
    push/
      subscribe/route.ts     — Register/unregister push subscription
      send/route.ts          — Manual push (requires CRON_SECRET)
      annual-fee-alerts/route.ts  — Cron: daily 8am UTC

src/components/
  layout/
    sidebar.tsx              — Desktop top nav (Best Card, Wallet, Settings + sign out)
    mobile-nav.tsx           — Mobile top header + bottom tab bar (Best Card, Wallet, Settings)
  wallet/                    — CardList, AddCardDialog, CardDetailSheet, CreditCardVisual, StatementCredits
  recommend/                 — RecommendTool (THE home screen component)
  settings/                  — SettingsContent, SubscriptionCard, PushNotificationsToggle
  onboarding/                — OnboardingFlow

src/lib/
  supabase/
    client.ts                — Browser client
    server.ts                — Server client
    middleware.ts            — Auth middleware (updateSession, route guards)
  types/database.ts          — All TypeScript interfaces
  utils/
    rewards.ts               — Reward calculation, card ranking, getCardName, getCardColor
    format.ts                — formatCurrency, formatDate
    utils.ts                 — cn() helper
  constants/
    categories.ts            — Category icons (lucide) and colors (hex)
```

## Navigation

**Desktop (sidebar.tsx):** Best Card (`/dashboard`) · Wallet (`/wallet`) | Settings · Theme toggle · Sign out

**Mobile (mobile-nav.tsx):** Bottom tab bar: Best Card · Wallet · Settings (no More sheet, no extra pages)

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          # Server-side only

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY

# Cron Auth
CRON_SECRET

# Email
RESEND_API_KEY
```

## Database Schema

### Reference Tables (public read)
- `spending_categories` — 14 categories: dining, travel, groceries, gas, streaming, online_shopping, transit, drugstores, home_improvement, entertainment, hotels, flights, car_rental, other
- `card_templates` — 104+ pre-built card definitions (name, issuer, network, annual_fee, reward_type, reward_unit, base_reward_rate, color)
- `card_template_rewards` — Multipliers per template per category. UNIQUE(card_template_id, category_id)

### User Tables (RLS: auth.uid() = user_id)
- `user_cards` — User's wallet. Template cards OR custom cards. Has nickname, last_four, sort_order, annual_fee_date
- `user_card_rewards` — Custom reward rate overrides per card per category. RLS scoped through user_cards ownership
- `statement_credits` — Annual credits per card (name, annual_amount, used_amount, reset_month)
- `push_subscriptions` — Web push endpoint + keys. UNIQUE(user_id, endpoint)
- `subscriptions` — Stripe subscription status (plan: free|premium)

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
Default 1.0 cpp. Value formula: `(projectedRewards * cppValue) / 100`

### Flexible Reward Cards (Citi Custom Cash, US Bank Cash+, BoA Customized)
These cards allow users to select which categories earn the bonus rate. Implementation:
- **Citi Custom Cash:** 1 bonus category at 5x (dining, gas, groceries, online_shopping, streaming, home_improvement, drugstores, entertainment)
- **US Bank Cash+:** 2 bonus categories at 5x, plus 1 everyday 2% category (from: dining, groceries, gas)
- **BoA Customized:** 1 bonus category at 3x (dining, gas, online_shopping, travel, drugstores, home_improvement)

When editing in wallet: user clicks "Change" → selects eligible categories → "Save" persists to `user_card_rewards` with the bonus multiplier. UI displays current selections with multiplier rate.

### Formatting
- Currency: `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`
- Dates: `date-fns` format "MMM d, yyyy" and "MMM d"

## Styling Conventions

- Tailwind CSS v4, supports light + dark theme via next-themes
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
- `/api/push/annual-fee-alerts` — Daily 8am UTC

## Premium Tier

- Price: $3.99/month or $39/year (17% savings)
- Currently: premium features (AI, Plaid) are deferred to v1.2+
- Stripe Checkout + Customer Portal manages subscriptions
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
