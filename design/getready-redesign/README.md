# GetReady redesign

Implemented October 6, 2026. No deployment performed.

## What changed

- The checklist is the default workspace for new and returning visitors. Removed the separate landing/overview flow and repeated dashboard summaries.
- Initial setup asks only for people, duration, and pets. Defaults work immediately, setup is skippable, and household settings remain editable.
- One suggested next action sits above a searchable checklist. Home, go-bag, and home supplies remain distinct and directly reachable.
- Rows show a quantity/status and an explicit completion action. Task names open a shared, keyboard-accessible detail dialog for guidance, exact inventory, storage, spending, and optional shopping links.
- Owned and packed/stored quantities remain separate. Undo restores the exact prior values, including partially completed and legacy inventory, without overwriting other tasks. Undo appears in the document flow without covering controls.
- The household plan has its own navigation destination. Kit management, backups, custom items, budgets, reminders, optional personalization, sources, and offline access live in Settings.
- Existing localStorage keys, migrations, calculation functions, public access, service worker, and printable summary were retained.

## Validation

- `npm test -- src/lib/gobag`: 54 tests passed, including four new completion/undo regressions.
- `npm run typecheck`: passed.
- Targeted ESLint for GetReady components and new helper/tests: passed.
- `npm run build`: passed. The initial sandboxed attempt could not fetch the application's existing Google Fonts; the network-enabled retry succeeded.
- `git diff --check`: passed.

Browser checks covered:

| Flow | Result |
| --- | --- |
| First visit | Setup shown; skipping or accepting opens the usable checklist in one action |
| Returning visit | Reload restored household settings and partial inventory directly into the checklist |
| Completion and undo | Progress updated; water restored to exactly 2 owned and 1 stored after undo |
| Household changes | Two people × seven days produced a 14-gallon water target; existing counts remained intact; pets added their supplies |
| Filtered completion | Completed row left the To do list; focus moved to Undo and returned to the restored row |
| Details | Escape closed the dialog and restored focus; long content scrolled vertically at narrow widths |
| Household plan | Test contact and meeting place persisted across navigation and kit switching |
| Kits | Created a separate kit and switched back without losing the original plan |
| Backup/restore | Download action exercised; restore fixture previewed and appended without replacing existing kits; imported counts were 5 owned / 2 stored with a 21-gallon target |
| Offline | Saved the production build, stopped the local server, reloaded the cached checklist, completed/undid a task, and opened household-plan fields successfully |
| Responsive | Checked 1440px, 390px, and 320px; no page horizontal overflow; all visible buttons at 320px were at least 44px high |
| Print | Print controls exercised and existing printable summary retained; native print preview was unavailable in the in-app browser |

Screenshots are from the local production build. Viewport testing used browser emulation, not physical iOS/Android devices; native mobile keyboards and printer output were not independently verified. Development-only offline caches can retain old un-hashed Next.js assets after edits; final checks used a clean origin and the production build.

## Screenshots

- `desktop-1440.png`: main checklist, 1440 × 1000 viewport.
- `mobile-390.png`: main checklist, 390 × 844 viewport.
- `mobile-detail-390.png`: shared supply detail view.
- `narrow-320.png`: checklist at 320 × 800.

Unrelated pre-existing repository changes were left untouched.
