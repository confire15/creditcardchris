# Credit Card Chris

Rewards app: "Which card should I use?" Features: Best Card Finder, Wallet, Benefits, Keep or Cancel, Alerts Hub, Fee Calculator. Vercel hosting, Supabase DB, creditcardchris.com.

Stack: Next.js 14 App Router, TypeScript, React 19, Supabase, shadcn/ui + Tailwind v4, Stripe, Resend, Twilio, web-push.

## Security (CRITICAL)
- Always `supabase.auth.getUser()`, never `getSession()` (spoofable via cookies)
- Server client: `@/lib/supabase/server`; Browser: `@/lib/supabase/client`; Service role (cron/webhooks only): `@/lib/supabase/service`
- All user tables: RLS `auth.uid() = user_id`. Indirect ownership (e.g. `user_card_rewards`): EXISTS subquery through `user_cards`
- Cron routes: wrap with `withCron()` from `src/lib/api/with-cron.ts`
- Premium check: `isPremiumPlan(sub)` from `@/lib/utils/subscription`

## Key Patterns
- **Reward calc order:** user_card_rewards → card_template_rewards → base_reward_rate. Formula: `Math.round(amount * multiplier * 100) / 100`
- **Card name:** `nickname > card_template.name > custom_name > "Unknown Card"`
- **Card color:** `card_template.color > custom_color > "#d4621a"`
- **GOTCHA:** `user_category_spend.monthly_amount` stores **annual** values — do NOT multiply by 12
- **Alerts:** `buildUpcomingAlerts()` in `src/lib/alerts/upcoming-alerts.ts` is single source of truth; load inputs via `loadUpcomingAlerts()` in `src/lib/alerts/load-upcoming-alerts.ts` (used by /alerts page and `/api/alerts/count`, which feeds the header bell badge)
- **Notifications:** push = all users; email/SMS = premium only, via `sendAlert()` in `src/lib/notifications/send-alert.ts`
- **Break-even:** `annualFee / ((multiplier - 1) * 0.01)`
- **CPP defaults:** `getDefaultCpp(rewardUnit)` from `src/lib/constants/default-spend.ts`

## Styling
Tailwind v4, light/dark via next-themes. Primary: `#d4621a`. Dark bg: `#0f1117`. Borders: `border-overlay-subtle`. Radius: `rounded-2xl`. Icons: lucide-react. Components: shadcn/ui.

## Premium ($3.99/mo, $39/yr)
- Premium: Keep or Cancel deep analysis, Alerts Hub live list, email/SMS channels
- Free: Best Card Finder, Wallet, Benefits, Fee Calculator, K/C verdict + top-line value
- Gate pattern: `isPremium` prop from server component → blur overlay or upsell card

## Do Not Add
Transactions UI, budgets UI, goals, AI chat, Plaid sync, transfer partners, subscriptions tracker.

## User Preferences
Batch all changes without asking confirmation on each item. Short, concise responses. No emojis unless asked.
