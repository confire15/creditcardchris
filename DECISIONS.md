# v2 Simplification — Decisions

Goal: collapse the app into five surfaces (Today · Ask · Wallet · Keep or Cancel · Alerts-via-bell),
4-item primary nav, net LOC down, all invariants in CLAUDE.md preserved.

## Audit map (2026-07-06)

### Pages

| Route | Decision | Notes |
|---|---|---|
| `/dashboard` (Today) | **keep** | Already v2-shaped: greeting, stat tiles, quick-ask, Coming up. Stat tiles (credits this month + delta vs last month + year total) ARE the "your month" module absorbed from `/recap`. |
| `/ask` | **keep** | Already absorbed `/best-card` (chips, amount input, answer card). |
| `/wallet` | **keep** | Tab hub already absorbs benefits/credits/offers/points/challenges/applications/annual-fees. Per-card detail lives in `card-detail-sheet.tsx` (rewards, perks, credits, fee). |
| `/keep-or-cancel` | **keep + absorb** | Absorbs Fee Calculator as `?mode=calculator` (same break-even engine, free tier). Quiet secondary link from the K/C page. |
| `/alerts` | **keep** | Bell-only entry; `buildUpcomingAlerts()` stays single source of truth. |
| `/settings` | **keep + absorb** | Absorbs the `/feedback` survey card as a Feedback section (`#feedback`). |
| `/calculator` | **fold → delete** | Redirect → `/keep-or-cancel?mode=calculator`. Wizard components kept (free-tier fee math), page removed from nav + routes. |
| `/recap` | **delete** | Redirect → `/dashboard`. Today's month stats replace it; `recap-page.tsx`, `lib/utils/recap.ts` deleted. Premium recap teaser removed from Today + Settings. |
| `/feedback` | **fold → delete** | Redirect → `/settings#feedback`. `FeedbackCard` + survey APIs kept, now rendered in Settings. |
| `/best-card`, `/benefits`, `/credits`, `/annual-fees`, `/wallet/{offers,points,challenges,applications,copilot}` | **delete stubs** | next.config redirects (already in place) make the in-app `redirect()` stub pages redundant. Stub dirs deleted. |
| `/onboarding` | **keep** | Fee-calculator footer link retargeted to `/keep-or-cancel?mode=calculator`. |
| `/settings/activity` | **keep** | Reached from Settings. |

### Nav
`nav-items.ts` drops Fee Calculator → exactly 4 items: Today · Ask · Wallet · Keep or Cancel. Bell (alerts) + avatar (settings) stay separate.

### Components
- `src/components/recap/` — **delete** (only used by deleted page).
- `src/components/calculator/` — **keep**, mounted under Keep or Cancel; `/api/agentic/fee-calculator/explain` still called by `step-results.tsx`.
- `src/components/feedback/` — **keep**, mounted in Settings.
- Everything else keeps its current home; wallet tab components stay (they're the fold targets from the old standalone pages).

### API routes
- `agentic/survey/*` — kept (FeedbackCard in Settings) and feeds `push/feedback-digest` cron.
- `agentic/fee-calculator/explain` — kept (calculator results step).
- Cron/webhook/external routes (`push/*`, `stripe/*`, `sms/*`, `digest`, `u/[code]`) — kept regardless of in-app callers.
- Post-cut caller audit: see "Dead API audit" below.

### Deliberate deviations from the brief
- **Wallet detail is a sheet + tabs, not a per-card page.** A prior pass consolidated benefits/credits/fees into wallet tabs and a rich card-detail sheet. Re-architecting to per-card detail pages would add code, not subtract; the brief's intent (one card hub, standalone pages gone) is met.
- **"Your month" module** = Today's existing stat tiles rather than a new recap widget; adding a second month module would duplicate them.
- **`user_category_spend.monthly_amount` NOT renamed.** Rename is prod-risky (live queries during deploy window, PostgREST schema cache); gotcha stays documented in CLAUDE.md instead.

## Dead API audit
Every `src/app/api/**/route.ts` was grepped for callers outside `src/app/api` (including
template-literal URLs for `[id]` routes). Kept regardless of callers: `withCron()` routes
(all `push/*`, `digest`, `sms/inbound`), `stripe/webhook`.

Deleted (zero callers anywhere in `src`):
- `api/credits/mark-claimed`
- `api/custom-categories` + `api/custom-categories/[id]`
- `api/export/all`, `api/export/wallet`
- `api/household/invite`, `api/household/members`, `api/household/card-instructions` (`api/household/accept` kept — used by `/household/accept`)
- `api/subs/at-risk`
- `api/wallet/card-cpp`
- `api/agentic/recommendations/[id]/accept`, `.../dismiss` (list route kept — used by copilot status bar)

## Verification (2026-07-06)
- `tsc --noEmit`, `next lint` (0 errors), `vitest` 56/56, `next build` all pass.
- All 12 legacy-route redirects verified via HTTP (308) on the dev server.
- Signed-in browser pass: Today (4-item nav, no recap teaser), Ask, Wallet tabs,
  Keep or Cancel list + `?mode=calculator` wizard + back link, Settings `#feedback`
  survey card, Alerts. Checked light + dark themes, desktop + 375px mobile
  (bottom tab bar shows Today · Ask · Wallet · Keep?).

## Phase 6 — dead-component sweep (same day)
Import-graph scan over `src/components` + `src/lib` (exact `@/` specifiers, then basename
cross-check for relative imports). Deleted 20 unreferenced files:
- K/C leftovers: `scenario-slider`, `spending-input`, `renewal-rescue-center`, `card-change-watchlist`
- Wallet leftovers: `spend-challenge-widget`, `rotating-category-tracker`, `card-quick-actions`,
  `statement-credits`, `_shared/StatusPill`, `_shared/Chip`
- Whole `components/subs/` dir (both dialogs), `perks/perks-list`, `perks/perk-progress`
- Settings: `spending-budgets`, `push-notifications-toggle` (push UI lives in Alerts Center + onboarding)
- Lib: `lib/audit.ts`, `lib/types/dashboard.ts`, `constants/template-credits.ts`, `constants/transfer-partners.ts`

Cascade: deleting those components orphaned four more API trees, also deleted:
`api/renewals`, `api/card-changes`, `api/rotating-categories`, `api/subs`.
Rotating-category/credit plumbing is unaffected — Ask/Today/alerts read via
`lib/alerts/*` and `lib/agentic/wallet-context`, not these HTTP routes.

Polish fixes while verifying: added missing `SheetDescription`/`DialogDescription`
(a11y warning) to card-detail-sheet, add-card-dialog, applications-page log dialog;
`priority` + explicit `width:auto` on header logo images (LCP + aspect-ratio warnings).

## Outcome
Net **−3,699 lines** (124 insertions, 3,823 deletions across 66 files) plus `DECISIONS.md`.
12 page routes deleted, 16 API route trees deleted, 20 dead components/lib files deleted,
nav reduced 5 → 4 items. `tsc`, lint (0 errors), 56/56 tests, `next build` all green after
each phase. Existing user data, Stripe subscriptions, crons, and premium gating untouched.
