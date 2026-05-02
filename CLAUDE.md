# Credit Card Chris - CLAUDE.md

## Project Overview

Credit card rewards app for points enthusiasts (5-10+ cards). The core value prop: **"Which card should I use right now?" — answered in 2 seconds.**

MVP features:
1. **Best Card Finder** — the home screen. Tap a category → see cards ranked by reward rate.
2. **Wallet** — add/manage cards from 104+ templates. Drag to reorder, archive, custom reward overrides, per-card perks.
3. **Benefits** — unified statement credits + perks tracker with reset tracking and log usage.
4. **Keep or Cancel** — annual fee analysis. Per-card KEEP/CANCEL/CLOSE CALL verdict with net value, alternative card comparison, and downgrade paths.
5. **Alerts Hub** — central view of upcoming annual fees, perk resets, and budget overages. Free users see an upsell; premium users see the live list and channel settings (push/email/SMS).
6. **Fee Calculator** — multi-step wizard that reveals a premium card's real net cost based on the user's spend and credits.

Everything else (transactions, budgets UI, goals, AI chat, insights, applications, Plaid sync, transfer partners, subscriptions tracker, command palette) is intentionally cut. The `transactions` and `spending_budgets` tables still exist as data sources for budget-alerts, but there is no user-facing CRUD for them. Do not add these features back without discussion.

- **Domain:** creditcardchris.com
- **Hosting:** Vercel (auto-deploys on push to main)
- **Database:** Supabase (PostgreSQL + Row Level Security)

## Post-MVP Roadmap (defer these until traction proven)

| Priority | Feature | Trigger |
|----------|---------|---------|
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
- **Email:** Resend
- **SMS:** Twilio
- **Themes:** next-themes

## Security Rules (CRITICAL)

### Authentication
- ALWAYS use `supabase.auth.getUser()`, NEVER `getSession()` — `getSession()` reads from cookies which can be spoofed
- Server components: `createClient()` from `@/lib/supabase/server`
- Client components: `createClient()` from `@/lib/supabase/client`
- Middleware refreshes auth tokens on every request via `updateSession()`
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`) is ONLY used in server-side API routes (cron jobs, webhooks) via `createServiceClient()` from `@/lib/supabase/service` — never expose to client

### Row Level Security
- Every user-scoped table MUST have RLS enabled with policies scoped to `auth.uid() = user_id`
- Tables with indirect ownership (e.g., `user_card_rewards`) scope through parent: `EXISTS (SELECT 1 FROM user_cards WHERE user_cards.id = ... AND user_cards.user_id = auth.uid())`
- Reference tables (`spending_categories`, `card_templates`, `card_template_rewards`, `card_template_credits`) are public SELECT only

### API Route Security
- Cron job routes wrap with `withCron()` (`src/lib/api/with-cron.ts`) which enforces `Authorization: Bearer ${CRON_SECRET}`
- Stripe webhook route verifies signature with `stripe.webhooks.constructEvent()`
- Premium-only routes check `subscriptions.plan === "premium"` (or use `isPremiumPlan(sub)` from `@/lib/utils/subscription`) before proceeding
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
    error.tsx                — Dashboard-scoped error boundary
    dashboard/page.tsx       — Dashboard with savings overview, expiring credits, annual fees total, my cards
    best-card/page.tsx       — Best Card Finder (RecommendTool). THE core feature.
    wallet/page.tsx          — Card management (add, reorder, archive)
    benefits/page.tsx        — Statement credits + perks tracker with log usage
    alerts/page.tsx          — Alerts Hub. Aggregates annual fee, perk reset, budget alerts. Premium-aware (passes isPremium to AlertsCenter).
    calculator/page.tsx      — Fee Calculator wizard entry. Login-only (no premium gate at the route).
    keep-or-cancel/page.tsx  — Annual fee analysis: KEEP/CANCEL/CLOSE CALL verdict per card
    credits/page.tsx         — Redirect-only stub → /dashboard
    settings/page.tsx        — Account, subscription, push notifications, sign out
    onboarding/page.tsx      — New user setup wizard. 4 steps including a Smart Alerts upsell. Lands on /dashboard.
  u/[code]/page.tsx          — Public referral profile (achievement badges)
  api/
    digest/route.ts          — Weekly email summary (cron: Monday 9am UTC)
    stripe/
      webhook/route.ts       — Subscription lifecycle
      create-checkout/route.ts
      portal/route.ts
    push/
      subscribe/route.ts     — Register/unregister push subscription
      send/route.ts          — Manual push (requires CRON_SECRET)
      annual-fee-alerts/route.ts  — Cron daily 8am UTC. All users get push at 30/7/1 days; premium also gets email/SMS via sendAlert
      perk-reset-alerts/route.ts  — Cron daily 8am UTC. All users get push at 30/7 days; premium also gets email/SMS
      budget-alerts/route.ts      — Cron daily 9am UTC. All users get push when over budget; premium also gets email/SMS

src/components/
  layout/
    sidebar.tsx              — Desktop top nav (Dashboard, Best Card, Alerts, Benefits, Keep or Cancel, Fee Calculator, Wallet + Settings)
    mobile-nav.tsx           — Mobile top header + bottom tab bar (Dashboard, Best Card, Alerts, Benefits, Keep/Cancel, Fee Calc, Wallet, Settings). Builds upcoming-alerts inline for premium badge count.
  dashboard/
    dashboard-content.tsx    — Main dashboard: savings overview, expiring credits, annual fees, my cards
  alerts/
    alerts-center.tsx        — Premium-gated alert list with upsell card for free users; surfaces channel settings inline
    alert-channel-settings.tsx — Push / email / SMS toggles + phone input (E.164)
  calculator/
    wizard-layout.tsx        — Top-level wizard shell + step routing
    calculator-reducer.ts    — useReducer state for wizard progression and selections
    calculator-types.ts      — Wizard state + action types
    premium-cards.ts         — Candidate set of premium cards used in the wizard
    results-math.tsx         — Net-cost computation for results step
    step-pick-card.tsx       — Step 1: select premium card
    step-spend-question.tsx  — Step 2: spend slider per category
    step-reality-check.tsx   — Step 3: do you actually use these credits?
    step-sorter.tsx          — Step 4: sort credits by usefulness
    step-results.tsx         — Step 5: animated reveal of effective annual fee
    spend-slider.tsx         — Reusable slider input
    credit-toggle.tsx        — Toggle a credit on/off in reality check
    card-mockup.tsx          — Card art mockup
    scenario-card.tsx        — Side-by-side scenario presentation
    utilization-modal.tsx    — Helper modal explaining utilization
    __tests__/               — Calculator unit tests
  benefits/
    benefits-page.tsx        — Statement credits tracker (Credits tab) + Perks tab
  wallet/
    card-list.tsx            — Drag-to-reorder wallet, set date, archive, edit actions
    card-detail-sheet.tsx    — Full card details sheet with credits, perks, overrides
    add-card-dialog.tsx      — Add card from template or custom
    credit-card-visual.tsx   — Animated card art component
    statement-credits.tsx    — Credits progress bars + log usage
    spend-challenge-widget.tsx — Spend challenge tracker widget
  recommend/
    recommend-tool.tsx       — THE home screen component: category grid → ranked cards
  keep-or-cancel/
    keep-or-cancel-page.tsx  — Main page: lists annual-fee cards with verdicts
    card-verdict.tsx         — Single card verdict badge + top-line net value
    value-breakdown.tsx      — Expandable credits/rewards/perks breakdown (premium)
    spending-input.tsx       — Annual spend per category input (premium)
    alternative-card.tsx     — No-AF alternative comparison panel
    downgrade-paths.tsx      — Same-issuer downgrade options (premium)
    scenario-slider.tsx      — What-if CPP sliders (premium)
  perks/
    perks-list.tsx           — Perks list with progress bars (surfaced in Benefits page)
    perk-progress.tsx        — Individual perk progress component
    add-perk-dialog.tsx      — Add/edit perk dialog
  settings/
    settings-content.tsx     — Account, subscription, notifications, sign out
    subscription-card.tsx    — Stripe subscription management
    notification-settings.tsx — Compact card linking to /alerts (real channel UI lives in alerts/alert-channel-settings.tsx)
    connected-accounts.tsx   — OAuth connected accounts
    spending-budgets.tsx     — Monthly spend budget settings (data feeds budget-alerts cron)
  onboarding/
    onboarding-flow.tsx      — 4-step wizard: Welcome → Add Cards → Smart Alerts upsell → Done with 4 destination tiles
  providers/
    theme-provider.tsx       — next-themes wrapper
  pwa-install-prompt.tsx     — PWA add-to-home-screen prompt

src/lib/
  supabase/
    client.ts                — Browser client
    server.ts                — Server client
    service.ts               — Service-role client (bypasses RLS — cron + webhook only)
    middleware.ts            — Auth middleware (updateSession, route guards)
  types/database.ts          — All TypeScript interfaces
  alerts/
    upcoming-alerts.ts       — buildUpcomingAlerts({ annualFeeCards, perks, budgets, transactions, now?, windowDays? }) returns flattened sorted alert list. Used by /alerts and the mobile-nav badge counter.
  api/
    with-cron.ts             — withCron() wrapper enforcing Authorization: Bearer ${CRON_SECRET}
    get-premium-user-ids.ts  — Batch-fetch premium user IDs in one query per cron run
  notifications/
    send-alert.ts            — Central fan-out (push + email + SMS based on prefs and premium)
    send-email-alert.ts      — Resend transport
    send-sms-alert.ts        — Twilio transport
  utils/
    rewards.ts               — Reward calculation, card ranking, getCardName, getCardColor
    format.ts                — formatCurrency, formatDate
    perks.ts                 — getNextResetDate(perk, fromDate?), hasPerkRemainingValue(perk)
    subscription.ts          — isPremiumPlan(sub) helper
    seed-credits.ts          — seedCreditsFromTemplate() — auto-populates statement_credits from card_template_credits during onboarding/add-card
    utils.ts                 — cn() helper
  constants/
    categories.ts            — Category icons (lucide) and colors (hex)
    default-spend.ts         — CPP defaults by reward unit (getDefaultCpp). Note: user_category_spend stores annual spend amounts despite the column being named monthly_amount.
```

## Navigation

**Desktop (sidebar.tsx):** Dashboard · Ask Chris · Best Card · Alerts · Benefits · Keep or Cancel · Fee Calculator · Wallet | Settings · Theme toggle · Sign out

**Mobile (mobile-nav.tsx):** Bottom tab bar: Dashboard · Ask Chris · Best Card · Alerts · Benefits · Keep/Cancel · Fee Calc · Wallet · Settings. Premium-only badge on Alerts shows `buildUpcomingAlerts` count (capped at 9+). Amber dot on Benefits indicates expiring credits in the next 7 days.

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

# SMS
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
```

## Database Schema

### Reference Tables (public read)
- `spending_categories` — 17 categories: dining, fast_food, travel, groceries, gas, streaming, online_shopping, transit, drugstores, home_improvement, entertainment, hotels, flights, car_rental, wholesale_clubs, gym_fitness, utilities, other
- `card_templates` — 104+ pre-built card definitions (name, issuer, network, annual_fee, reward_type, reward_unit, base_reward_rate, color)
- `card_template_rewards` — Multipliers per template per category. UNIQUE(card_template_id, category_id)
- `card_template_credits` — Per-template default credits used by `seedCreditsFromTemplate()` during onboarding/add-card
- `card_downgrade_paths` — Known product-change/downgrade paths between templates (from_template_id, to_template_id, relationship, notes). Seeded with 13 paths: Chase CSR→CFU/CFF/CSP, Amex Plat→Gold/Green, BCP→BCE, CapOne Venture X→Venture/QS, Citi Premier→DC

### User Tables (RLS: auth.uid() = user_id)
- `user_cards` — User's wallet. Template cards OR custom cards. Has nickname, last_four, sort_order, annual_fee_date, custom_annual_fee, points_expiration_date
- `user_card_rewards` — Custom reward rate overrides per card per category. RLS scoped through user_cards ownership
- `statement_credits` — Annual credits per card (name, annual_amount, used_amount, reset_month, will_use)
- `card_perks` — Non-dollar benefits (lounge access, free night, TSA PreCheck, etc.). Fields: name, perk_type, value_type (dollar|count|boolean), annual_value, annual_count, used_value, used_count, is_redeemed, reset_cadence, reset_month, last_reset_at, notify_before_reset, notify_days_before, sort_order
- `spending_budgets` — Monthly spend limits per category. Data source for budget-alerts cron. No user-facing CRUD page.
- `transactions` — Transaction records used by budget-alerts to compute current-month spend per category. No user-facing CRUD.
- `user_category_spend` — **Annual** spend estimates per category for Keep or Cancel analysis (source: manual|transaction|default). UNIQUE(user_id, category_id). Note: column is named `monthly_amount` but stores annual values — formula does NOT multiply by 12.
- `push_subscriptions` — Web push endpoint + keys. UNIQUE(user_id, endpoint)
- `notification_preferences` — Per-user channel opt-in: push_enabled, email_enabled, sms_enabled, phone_number (E.164). UNIQUE(user_id). Email/SMS are premium-only.
- `subscriptions` — Stripe subscription status (plan: free|premium)
- `audit_logs` — Sensitive-operation audit trail (server-side writes only)

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

Use `getDefaultCpp(rewardUnit)` from `src/lib/constants/default-spend.ts` to get the appropriate default by reward unit:
- Cash Back: 1.0 cpp
- Ultimate Rewards / Membership Rewards / ThankYou Points: 1.5 cpp
- Capital One Miles / Venture Miles: 1.0 cpp
- Airline miles (generic): 1.3 cpp
- Hotel points: 0.5–0.7 cpp depending on program

### Flexible Reward Cards (Citi Custom Cash, US Bank Cash+, BoA Customized)
These cards allow users to select which categories earn the bonus rate. Implementation:
- **Citi Custom Cash:** 1 bonus category at 5x (dining, gas, groceries, online_shopping, streaming, home_improvement, drugstores, entertainment)
- **US Bank Cash+:** 2 bonus categories at 5x, plus 1 everyday 2% category (from: dining, groceries, gas)
- **BoA Customized:** 1 bonus category at 3x (dining, gas, online_shopping, travel, drugstores, home_improvement)

When editing in wallet: user clicks "Change" → selects eligible categories → "Save" persists to `user_card_rewards` with the bonus multiplier. UI displays current selections with multiplier rate.

### Alerts Aggregation
`buildUpcomingAlerts()` from `src/lib/alerts/upcoming-alerts.ts` is the single source of truth for the alerts hub and the mobile-nav badge. It takes pre-fetched `annualFeeCards`, `perks`, `budgets`, and current-month `transactions`, and emits a flattened sorted list of `UpcomingAlert` objects (annual_fee | perk_reset | budget_overage). Both `/alerts/page.tsx` (server-side fetch) and `mobile-nav.tsx` (client-side fetch) use it; same shape, same logic.

### Notification Channel Gating
`sendAlert()` in `src/lib/notifications/send-alert.ts` is the central dispatcher. Push goes to all users with active `push_subscriptions`. Email/SMS only fire when `isPremium === true` AND the corresponding `notification_preferences` toggle is on. Cron routes pass an `isPremium` flag derived from `getPremiumUserIds()`.

### Formatting
- Currency: `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`
- Dates: `date-fns` format "MMM d, yyyy" and "MMM d"

## Styling Conventions

- Tailwind CSS v4, supports light + dark theme via next-themes
- Primary color: orange `#d4621a`
- Dark background: `#0f1117`
- Border opacity: `border-white/[0.06]` (dark) — use `border-overlay-subtle` CSS variable for light-mode-compatible borders
- Hover bg: `bg-primary/[0.08]`
- Card radius: `rounded-2xl`
- Component shadows: `shadow-md shadow-primary/20`
- All UI components from shadcn/ui (Radix primitives)
- Icons from lucide-react

## Cron Jobs (vercel.json)

All cron routes wrap with `withCron()` and require `Authorization: Bearer ${CRON_SECRET}`. Channel gating happens inside `sendAlert()` — push goes to all users with active subscriptions; email/SMS only to premium users.

- `/api/digest` — Monday 9am UTC (weekly email summary)
- `/api/push/annual-fee-alerts` — Daily 8am UTC. All users get push at 30/7/1 days; premium also gets email/SMS
- `/api/push/perk-reset-alerts` — Daily 8am UTC. All users get push at 30/7 days; premium also gets email/SMS
- `/api/push/budget-alerts` — Daily 9am UTC. All users get push when over budget; premium also gets email/SMS

## Premium Tier

- Price: $3.99/month or $39/year (17% savings)
- **Live premium features:**
  - Keep or Cancel deep analysis (full value breakdown, annual spend input per category, top 3 no-AF alternatives, downgrade paths with instructions)
  - Alerts Hub (`/alerts`) — live aggregated list of upcoming annual fees, perk resets, and budget overages. Free users see an upsell card; premium users see the live list and channel toggles. Mobile nav badge is premium-only.
  - Email & SMS notification channels (push is free for all users; email/SMS layered on for premium via `sendAlert()`)
- **Free for everyone:** Best Card Finder, Wallet, Benefits, Fee Calculator (`/calculator` has no route-level premium gate), Keep or Cancel verdict + top-line net value
- **Deferred to v1.2+:** AI assistant, Plaid bank sync
- Stripe Checkout + Customer Portal manages subscriptions
- Webhook handles: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
- Premium gate pattern: `isPremium` prop (derived via `isPremiumPlan(sub)`) passed from server component → blur overlay or upsell card with upgrade CTA for free users

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
