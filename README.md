# GoBag — emergency go-bag builder

GoBag lives in the existing Credit Card Chris Next.js App Router project at **`/go-bag`**. It requires no account, database, Amazon API, or additional backend. The existing rewards application and its configuration are retained.

## Run locally

```sh
npm install
npm run dev
```

Open [http://localhost:3000/go-bag](http://localhost:3000/go-bag). Use `npm run dev -- --port 3100` if port 3000 is occupied. GoBag itself needs no environment variables. The rest of this repository has separate service integrations. Production builds need network access for the existing root layout’s Google Fonts.

```sh
npm run typecheck
npm run lint
npx vitest run src/lib/gobag/__tests__
npm run build
```

## Architecture

- `src/app/go-bag/page.tsx`: server entry and SEO metadata.
- `src/components/gobag/gobag.tsx`: state orchestration, filters, personal/pet sections, shopping/reset dialogs, resources, FAQ, and printable summary.
- `src/components/gobag/kit-parts.tsx`: reusable header, hero, configurator, item cards, quantity badges, progress, Amazon buttons, and cost summary.
- `src/components/gobag/gobag.module.css`: route-scoped, responsive light theme and print rules. The shared application retains its Tailwind CSS setup; dialogs reuse its shadcn/Radix accessible primitives.
- `src/data/emergency-items.ts`: typed checklist content, quantity rules, manual USD price ranges, and official resource URLs.
- `src/lib/gobag/kit.ts`: pure quantity, cost, progress, and saved-state validation helpers.
- `src/lib/gobag/use-kit.ts`: browser persistence with guarded reads/writes and a session-only fallback.
- `src/lib/gobag/amazon.ts`: URL-encoded Amazon searches and optional affiliate configuration.
- `public/gobag/`: original local SVG illustration and icon. No remote product imagery.

## Amazon Associates

Add this optional public setting to `.env.local` (and to the deployment’s build environment):

```dotenv
NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG=yourtag-20
```

Restart the development server or rebuild after changing it. This is a public affiliate identifier, not a secret. `getAmazonSearchUrl(searchTerm)` creates `https://www.amazon.com/s?k=...` and adds `tag` only when configured. The affiliate disclosure also appears only when a tag exists. No Amazon products, prices, availability, or reviews are fetched or scraped. Links open individually; the shopping drawer never automatically opens multiple tabs.

## Quantities and estimates

- Water: people × selected days × 1 gallon; excludes additional water for pets. Full reserves may need storage separate from a portable bag.
- Food: one **person-day** of food per person per selected day, not a manufacturer serving count.
- Item prices are manually configured **per unit**, then multiplied by the recommended quantity. All ranges are illustrative USD budgets, not current retailer quotes. Shipping, taxes, optional personal supplies, pet water, and veterinary records are excluded. Read each item’s quantity notes before changing data.
- Pet count is independent of household size. Pet food is counted in pet-days; pet water is a reminder to plan an animal’s individual daily needs, not a calculated gallon amount.
- Owned and packed/stored quantities are tracked separately. Remaining costs use only `max(0, required - owned)`. Packing also marks those units owned; reducing ownership clamps packed quantity. Existing packed quantities migrate as owned. Increasing the household target only adds the difference to shopping costs.
- The 22 standard essentials share phone power banks and cables across the Power and Communication / Phone requirements to avoid duplicate purchases. The two radio entries explain that one device with both features can cover both.
- Personal essentials are optional, saved separately, and excluded from the essentials percentage and cost. Pet essentials join those totals when pet mode is enabled; unpriced items are clearly labeled.
- Go-Bag / Stay-Home reorders carry essentials and home reserves, changes advice, and supports storage-group filtering. It does not reduce the daily water requirement or hide household reserves.

## Persistence and privacy

The legacy `readykit:v1` LocalStorage entry (retained to preserve saved checklists) stores household size, days, pet settings, kit mode, and completed quantities. No checklist data is sent to a server. State is validated before use; unknown IDs and invalid values are discarded. Storage failures leave the current-session checklist usable. This is not cross-device sync. The optional offline service worker stores the public checklist shell and static assets; the plan remains in LocalStorage. Reset requires confirmation.

## Subdomain publishing

`src/proxy.ts` rewrites the root of **`gobag.creditcardchris.com`** to `/go-bag`, before authentication middleware. Direct `/go-bag` access also bypasses session/database work. Other routes retain their existing behavior.

To publish, use an authorized Vercel account for this repository’s existing project, deploy the reviewed changes, and add `gobag.creditcardchris.com` as a project domain. Apply the exact DNS record Vercel provides and wait for domain/TLS verification. Do not assume the domain is live just because the rewrite works locally. Review unrelated working-tree changes before deploying this shared app.

**Published:** [gobag.creditcardchris.com](https://gobag.creditcardchris.com) is live on Vercel with verified HTTPS. IONOS has an A record for `gobag` pointing to `216.198.79.1`; its previous default-site A/AAAA records were replaced. Vercel reports the domain correctly configured.

Production releases are built from the committed GoBag source. Pushes to `main` trigger Vercel builds; verify the release before assigning `gobag.creditcardchris.com` with `vercel alias set`. For isolated CLI releases, use `--prod --skip-domain` and assign only the GoBag hostname. Review unrelated working-tree changes before publishing from this shared repository.

## Accessibility and printing

Native labeled checkboxes, pressed-state filters, visible keyboard focus, skip navigation, a semantic progress element, and Radix dialogs support keyboard use. Dialogs trap focus, close with Escape, and return focus to their opener. Mobile has a bottom summary; each shopping link is opened individually. Print uses a separate “My Emergency Kit” summary that includes all supplies regardless of screen filters, plus personal reminders and guidance; navigation, buttons, and drawers are excluded.

## Content and safety

This is an independent planning aid, not a safety guarantee or government-endorsed kit. Follow local emergency, utility, and healthcare guidance for individual needs. No utility-work instructions or claims of tested/approved Amazon products are included. The user-specified Ready.gov URLs are retained; direct automated checks received HTTP 403, while indexed official Ready.gov material confirmed the general checklist guidance. These links should also be reviewed in a normal browser before publishing.

## Verification

Production build and TypeScript pass. GoBag has 38 focused inventory, migration, calendar, routing, and offline tests. Browser checks cover persistence, quantity changes, pets, filters, reset, dialog focus, LocalStorage failure, printing, and responsive widths from 320 to 1440 pixels. The current desktop and mobile planning flows passed Axe WCAG A/AA checks. Repository lint has zero errors and five pre-existing hook-dependency warnings outside GoBag. Automated checks do not replace assistive-technology testing.


## Planning and offline features

- `src/data/gobag-guidance.ts`: editorial shopping priorities, buying criteria, household needs, plan fields, and dated sources.
- `src/components/gobag/planning.tsx`: partial inventory controls, personalization, budget/storage filters, review dates, household plan, printable additions, and source review.
- `src/lib/gobag/reminders.ts`: due-date logic and downloadable all-day `.ics` reminders. No background alerts are sent by GoBag. Calendar imports may duplicate events; remove old imports when replacing dates.
- `src/components/gobag/offline-support.tsx` and `public/gobag-sw.js`: opt-in offline caching. Open the production site online and choose **Save for offline use**, then test a fresh offline navigation. Amazon and reference links still require internet. Refresh offline storage after an update; browsers may evict cached files.
- `public/gobag/manifest.webmanifest`: installation metadata and dedicated PNG icons. Installation support depends on browser; Safari users can use Share → Add to Home Screen.
- Review dates, personalization, and household contact/meeting-place fields persist locally and print with the kit. No plan data is sent to a backend; LocalStorage is not encrypted. Reset clears this information too.
- The worker only handles public GoBag navigation and static assets. It does not cache API responses, authenticated pages, or plan data. On the GoBag hostname it uses root scope; on other hosts it is scoped to `/go-bag` so the rewards app’s push worker remains separate.
- Guidance review is an editorial snapshot, not live monitoring or product validation. Direct Ready.gov fetching can return 403; the review identifies the accessible CDC and NIA sources used.
