# ReadyKit — emergency go-bag builder

ReadyKit lives in the existing Credit Card Chris Next.js App Router project at **`/go-bag`**. It requires no account, database, Amazon API, or additional backend. The existing rewards application and its configuration are retained.

## Run locally

```sh
npm install
npm run dev
```

Open [http://localhost:3000/go-bag](http://localhost:3000/go-bag). Use `npm run dev -- --port 3100` if port 3000 is occupied. ReadyKit itself needs no environment variables. The rest of this repository has separate service integrations. Production builds need network access for the existing root layout’s Google Fonts.

```sh
npm run typecheck
npm run lint
npx vitest run src/lib/readykit/__tests__
npm run build
```

## Architecture

- `src/app/go-bag/page.tsx`: server entry and SEO metadata.
- `src/components/readykit/readykit.tsx`: state orchestration, filters, personal/pet sections, shopping/reset dialogs, resources, FAQ, and printable summary.
- `src/components/readykit/kit-parts.tsx`: reusable header, hero, configurator, item cards, quantity badges, progress, Amazon buttons, and cost summary.
- `src/components/readykit/readykit.module.css`: route-scoped, responsive light theme and print rules. The shared application retains its Tailwind CSS setup; dialogs reuse its shadcn/Radix accessible primitives.
- `src/data/emergency-items.ts`: typed checklist content, quantity rules, manual USD price ranges, and official resource URLs.
- `src/lib/readykit/kit.ts`: pure quantity, cost, progress, and saved-state validation helpers.
- `src/lib/readykit/use-kit.ts`: browser persistence with guarded reads/writes and a session-only fallback.
- `src/lib/readykit/amazon.ts`: URL-encoded Amazon searches and optional affiliate configuration.
- `public/readykit/`: original local SVG illustration and icon. No remote product imagery.

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
- Checkboxes confirm the full displayed quantity. Saved completion records the quantity at the time it was checked. Increasing requirements returns affected items to Missing. Until reconfirmed, the estimate budgets the full quantity rather than a partial top-up.
- The 22 standard essentials share phone power banks and cables across the Power and Communication / Phone requirements to avoid duplicate purchases. The two radio entries explain that one device with both features can cover both.
- Personal essentials are optional, saved separately, and excluded from the essentials percentage and cost. Pet essentials join those totals when pet mode is enabled; unpriced items are clearly labeled.
- Go-Bag / Stay-Home changes planning advice. It deliberately does not reduce the daily water requirement.

## Persistence and privacy

The `readykit:v1` LocalStorage entry stores household size, days, pet settings, kit mode, and completed quantities. No checklist data is sent to a server. State is validated before use; unknown IDs and invalid values are discarded. Storage failures leave the current-session checklist usable. This is not cross-device sync or an offline service worker. Reset requires confirmation.

## Subdomain publishing

`src/proxy.ts` rewrites the root of **`gobag.creditcardchris.com`** to `/go-bag`, before authentication middleware. Direct `/go-bag` access also bypasses session/database work. Other routes retain their existing behavior.

To publish, use an authorized Vercel account for this repository’s existing project, deploy the reviewed changes, and add `gobag.creditcardchris.com` as a project domain. Apply the exact DNS record Vercel provides and wait for domain/TLS verification. Do not assume the domain is live just because the rewrite works locally. Review unrelated working-tree changes before deploying this shared app.

**Published:** [gobag.creditcardchris.com](https://gobag.creditcardchris.com) is live on Vercel with verified HTTPS. IONOS has an A record for `gobag` pointing to `216.198.79.1`; its previous default-site A/AAAA records were replaced. Vercel reports the domain correctly configured.

The release is `my-rewards-8emkbbwpt-confire-5950s-projects.vercel.app`, built from baseline commit `3cdf9f8` plus the ReadyKit files and hostname rewrite. It was deployed with `--prod --skip-domain`, then only `gobag.creditcardchris.com` was assigned to it. The main domain aliases retain their previous deployment. Future shared-project production releases must include the ReadyKit additions and rewrite before reassigning this domain. Review and commit the relevant source changes before relying on Git-based deployments.

## Accessibility and printing

Native labeled checkboxes, pressed-state filters, visible keyboard focus, skip navigation, a semantic progress element, and Radix dialogs support keyboard use. Dialogs trap focus, close with Escape, and return focus to their opener. Mobile has a bottom summary; each shopping link is opened individually. Print uses a separate “My Emergency Kit” summary that includes all supplies regardless of screen filters, plus personal reminders and guidance; navigation, buttons, and drawers are excluded.

## Content and safety

This is an independent planning aid, not a safety guarantee or government-endorsed kit. Follow local emergency, utility, and healthcare guidance for individual needs. No utility-work instructions or claims of tested/approved Amazon products are included. The user-specified Ready.gov URLs are retained; direct automated checks received HTTP 403, while indexed official Ready.gov material confirmed the general checklist guidance. These links should also be reviewed in a normal browser before publishing.

## Verification

Production build and TypeScript pass. ReadyKit has 27 focused unit/routing tests. Browser checks cover persistence, quantity changes, pets, filters, reset, dialog focus, LocalStorage failure, printing, and responsive widths from 320 to 1440 pixels. Axe reported no WCAG A/AA violations in the tested desktop, mobile, packed-item, pet, and dialog states. Repository lint has zero errors and five pre-existing hook-dependency warnings outside ReadyKit. Automated checks do not replace assistive-technology testing.
