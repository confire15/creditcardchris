# Prepare layout polish — October 27, 2026

Implemented locally; not deployed. Existing unrelated workspace changes and production user data were left untouched. Browser testing used a separate localhost:3017 origin and synthetic household data. Its test data remains in that local browser origin.

## Changes

- Shopping search and Category now have visible labels and identical 48px outer boxes with matching top/bottom edges. Removed inherited search margins within the filter grid.
- Added deliberate spacing between the heading, description, primary action, budget disclosure, filters, and cards. Grouped quantity, ownership, and buying-help actions together instead of separating them across the card width. Expanded help uses the full card width.
- Standardized planner buttons, borders, typography, disclosure spacing, wrapping, and embedded Settings panels. Custom supplies use two columns when space permits and one on phones.
- Fixed household-plan checkboxes inheriting text-input padding/minimum heights and vertical label direction.
- Fixed quantity-dialog overflow from an inline review-date field and legacy negative margins on the ownership checkbox row.
- Improved empty-state recovery: Show all supplies resets search, completion view, and essentials filtering; empty task sections explain the current view. Shopping no-results messages announce status.
- Increased input border contrast to about 3.86:1 against white. Checked green/white button contrast is 7.52:1; muted and placeholder text exceed 4.5:1 against white. This is a targeted color check, not accessibility certification.

## Browser evidence

Inspected actual screenshots at requested 375×812, 768×1024, and 1440×1000 viewports. The browser's content widths were 369, 762, and 1434 with its scrollbar; corresponding measured page scroll widths matched. After fixing the ownership row, no dialog descendants had measured horizontal overflow.

Checked My plan, Shopping, every Settings subsection, expanded household fields, supply quantity dialog, storage/spending disclosure, review-date fields, kit management disclosure, buying help, and budget/share disclosure. Tested:

- Search including whitespace/case, Water category, no results, Clear filters.
- Water ownership 0 → 2 → 3; Shopping removed the fully owned item, and My plan retained 3 owned after reload. Owning remains separate from packing.
- Two people / seven days correctly changed water target to 14, with 11 still needed. The same values survived the final production-build reload.
- Budget 500 persisted across Shopping and Settings. Family-list download succeeded; inspected output contained target 14, owned 3, stored 0.
- Blank custom-name validation and a synthetic custom supply; custom supply appeared in plan and Shopping counts.
- Done-view empty state and Show all supplies recovery to All.
- Main navigation, Settings subsections, browser Back/Forward, keyboard focus, and Escape returning focus to Edit quantity.
- Production console: no captured errors. Development logs contained expected Fast Refresh reload warnings.
- Production page resource audit: all 23 discovered local scripts/styles/images/manifest resources returned HTTP 200; see resource-check.json. No app-attributable request failures observed. This is not a complete network trace.

## Checks

Full Vitest suite passed before the added regression (139 tests). Added a regression for partial ownership, custom supplies, household changes, backup round-trip, and agreement between plan/Shopping totals; its audit file passed all 11 tests. Final full suite: 140 tests passed across 16 files.

TypeScript and production build passed. ESLint had no errors and five existing hook-dependency warnings outside Prepare. git diff --check passed. Production build retains the existing edge-runtime/static-generation notice.

## Limits

No deployment, physical-device tests, full screen-reader audit, print/PDF inspection, or new offline-disconnection test. All-owned Shopping empty state and backup parsing remain covered by existing model tests rather than a new complete browser walkthrough. Restore/delete dialogs were reviewed in source but not exercised in this run. Automatic approval review rejected creating and retaining an extra test kit because it would add saved data; that action was not retried. No real production library was imported.

## Screenshots

Final production Shopping: desktop-shopping.png, tablet-shopping.png, mobile-shopping.png. Other captures: desktop-plan.png, mobile-plan.png, desktop-settings.png, mobile-settings.png, tablet-settings.png, tablet-household.png, mobile-dialog.png. Some secondary captures were taken during development before the final input-border contrast adjustment; primary Shopping captures reflect the final build.
