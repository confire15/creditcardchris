# Credit Card Chris

Rewards app: "Which card should I use?" Vercel hosting, Supabase DB, creditcardchris.com.

Stack: Next.js 14 App Router, TypeScript, React 19, Supabase, shadcn/ui + Tailwind v4, Stripe, Resend, Twilio, web-push.

## Information Architecture (v2)
Five surfaces; primary nav is exactly 4 items + bell + avatar:
- **Today** `/dashboard` — greeting, credit/fee stat tiles (the "your month" module), quick-ask, Coming up, action list
- **Ask** `/ask` — the answer surface (absorbed `/best-card`)
- **Wallet** `/wallet` — tab hub (cards · credits-benefits · offers · points · challenges · applications · annual-fees) + per-card detail sheet
- **Keep or Cancel** `/keep-or-cancel` — verdicts; Fee Calculator lives at `?mode=calculator` (absorbed `/calculator`)
- **Alerts** `/alerts` — bell only, not primary nav

Feedback survey lives in Settings (`/settings#feedback`). Deleted routes 301 via `next.config.ts` redirects: `/best-card`, `/benefits`, `/credits`, `/annual-fees`, `/calculator`, `/recap`, `/feedback`, `/wallet/{offers,points,challenges,applications,copilot}`. See `DECISIONS.md` for the keep/fold/delete map.

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
- Free: Ask (best card), Wallet (incl. benefits/credits), Fee Calculator mode, K/C verdict + top-line value
- Gate pattern: `isPremium` prop from server component → blur overlay or upsell card

## Do Not Add
Transactions UI, budgets UI, goals, Plaid sync, transfer partners, subscriptions tracker.

> **Conversational assistant (SMS):** The former "no AI chat" rule is lifted **specifically** for the SMS assistant — an inbound text thread that answers "which card should I use?" and surfaces alerts. Scope is the texting front-door only. Do NOT add a general in-app chat UI on web; wallet setup, Benefits, and Keep-or-Cancel stay on web.

## User Preferences
Batch all changes without asking confirmation on each item. Short, concise responses. No emojis unless asked.
