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

## v2.1 polish pass — audit punch list (2026-07-06)
Audited /dashboard, /ask, /wallet, /keep-or-cancel, /alerts at 375px, both themes.
Findings (fix order: tokens → Today → Wallet → Ask/K-C/Alerts):
1. **No type scale.** Page titles differ per route ("Your Wallet" ~40px vs "Keep or Cancel" ~34px); dollar values use ad-hoc sizes, no tabular-nums. → tokenize display/title/label/body/caption in globals.css.
2. **Accent overuse.** Today shows 4+ orange elements in one viewport (date eyebrow, Ask pill, Run review, category icon). Wallet has a full-width orange "+" bar. Rule: one orange element per screen region — orange = the answer/primary action.
3. **Today stat tiles misaligned.** "Credits used this month" label wraps to 2 lines, pushing its $ value below neighbors' baselines; "$0.00" in green on "credits used this year" is semantic noise. → fixed-height labels, aligned numbers, neutral values.
4. **Wallet card grid:** card name clipped under the P1 badge; sort select renders as an empty input-looking control; only 3 wallet tabs visible with no scroll affordance for the other 4.
5. **K/C:** empty blue pill where card art should be (color chip renders but no label/art) — acceptable; verdict treatment already distinct.
6. Next dev overlay reports 1 issue with no console/server error — dev-only, not reproducible in logs.

### v2.1 polish pass — round 1 outcomes (2026-07-06)
- Type-scale tokens landed in `globals.css`: `.text-display`, `.text-page-title`,
  `.text-section-label`, `.text-stat`, `.text-caption` (display/stat use tabular-nums,
  display clamps for 375px). All five primary surfaces now draw headings/numbers from
  the scale — PageHeader h1, Today greeting+tiles, Ask hero/answer, K/C stat strip, Alerts upsell title.
- PageHeader: actions row no longer stacks full-width on mobile (killed the giant
  orange "Add card" bar on Wallet); description drops to text-sm on mobile.
- Today tiles: uniform label/value/caption rows with fixed min-heights → aligned
  baselines at 375px; dropped green on year total and orange on the date eyebrow
  (accent rule: Ask module owns the region's single orange).
- Ask: quick chips ≥44px; answer card multiplier gets the display treatment with
  flex-wrap so long card names never truncate; "Projected rewards" uses section-label + stat.
- Wallet card grid: name max-width 68% so names clear the P1 owner badge.
- K/C: stat strip on scale; removed whitespace-nowrap on verdicts (was forcing
  horizontal page scroll at 375px — now scrollWidth 375/375).
- Verified logged-in at 375px dark+light: Today, Ask (chip→answer flow), Wallet,
  K/C, Alerts. tsc clean, lint 0 errors, 56/56 tests.
- Still open for round 2: bundle/Lighthouse pass (§3 budgets), sheet/dialog motion
  standardization, empty-state designs, 320px sweep.

### v2.1 polish pass — round 2 (2026-07-06/07)
- Bundle audit: `next build` clean; lucide icons auto-tree-shaken by Next 16;
  Wallet's CardDetailSheet + AddCardDialog already dynamic-imported. Removed
  `recharts` from package.json — installed but imported nowhere.
- Motion: Sheet open/close standardized to 250/200ms ease-out (was 500/300 ease-in-out);
  Dialog already 200ms. Global prefers-reduced-motion kill-switch unchanged.
- 320px sweep (logged in, dark): Today, Ask, Wallet, K/C, Alerts all report
  scrollWidth 320/320 — zero horizontal scroll.
- Lighthouse mobile (local `next start`, headless Chrome, logged-in via cookie header):
  Today 77 → LCP 5.4s/CLS 0 · Ask 81 → LCP 4.8s/CLS 0 · Wallet 78 → LCP 5.9s/CLS 0.014.
  CLS budget (<0.05) met everywhere. LCP/perf dominated by SSR TTFB to hosted
  Supabase from a residential connection (~0.9–1.4s root document) plus 4x CPU
  throttle; scores varied 67–81 across identical runs. Fixed the one remaining
  dashboard waterfall (cards-gate query folded into the parallel batch, ~300ms
  warm TTFB saved). The ≥90 budget needs re-measuring on Vercel same-region infra —
  local numbers are not representative. Left: run PageSpeed against production
  after next deploy.

### v2.1 polish pass — round 3 (2026-07-07)
- Production check: PSI anonymous quota was exhausted; ran local Lighthouse against
  creditcardchris.com instead. Auth token expired mid-run so the app pages 302'd to
  /login — but the numbers confirm the infra thesis: prod TTFB 30ms (vs ~1s local),
  CLS 0.004, /login scored 82–92. Authed pages should be re-measured from a real
  device or fresh PSI quota; expected to land near the ≥90 budget.
- New shared `EmptyState` primitive (`ui/empty-state.tsx`): fanned card-art motif +
  title + body + single CTA. Applied to Wallet tabs: offers, points, challenges,
  applications (points/applications previously had bare one-liner divs).
- `PremiumGate` overlay redesigned: was a naked lock + tiny CTA floating on a blur;
  now a designed upsell card (primary-tinted lock chip, 44px full-width CTA,
  glass panel with primary border) over the dimmed preview, with a min-height so
  the card never spills over page titles. Benefits every gated surface (K/C
  downgrade paths/alternatives, offers, points, challenges, applications).
- Verified at 375px dark: challenges + points gates. Lint 0 errors, 56/56 tests.

### v2.1 polish pass — round 4 (2026-07-07)
- Card detail: presents as a bottom sheet on <640px (grab handle, rounded top,
  88dvh max height) and a right panel on desktop, via a matchMedia hook in
  card-detail-sheet; ad-hoc field labels swapped to `.text-section-label`.
- Ask quick chips: horizontal snap-scroll row on mobile (peeking chip as
  affordance), wraps centered on sm+.
- Auth (login/signup/layout) and onboarding headings moved onto the type scale
  (`.text-page-title`; onboarding welcome/finish heroes use `.text-display`).
- Verified at 375px dark: card bottom sheet open/scroll, Ask chip row. Lint 0
  errors, 56/56 tests.

### v2.1 polish pass — round 5 (2026-07-07)
- Card detail now uses vaul Drawer instead of the Radix Sheet: native
  drag-to-dismiss + built-in handle on the mobile bottom sheet, right panel
  (max-w-md, custom X close) on desktop via direction switch on the same
  matchMedia hook. Verified both orientations in the browser.
- Dashboard error boundary redesigned to match the empty-state language:
  fanned-card motif with a destructive-tinted center card, single full-width
  44px "Try again" CTA, quiet "Go to Today" text link, caption-level error ID.
- Lint 0 errors, 56/56 tests.

### v2.1 polish pass — round 6 (2026-07-07)
- Authed production Lighthouse (fresh token, www host — note: the apex→www
  redirect drops Lighthouse's extra-headers, measure www directly):
  Today 81 / LCP 5.0s · Ask 88 / 3.7s · Wallet 81 / 5.1s, CLS ≤0.016, TTFB 30ms.
- Diagnosed Today's FCP→LCP gap (1.2s → 5.0s): the action list (the page's
  largest element) waited on a client-side GET /api/actions. Now the page
  server-loads `listUserActions()` inside the existing Promise.all and passes
  `initialActions` to DashboardContent; client fetch only fires as a fallback
  when the server returns none. Verified: zero /api/actions requests on load,
  "This Week" in the initial HTML.
