# Action App QA

Run this after the `user_actions` migration is applied and you can log in locally.

## Setup
- Start dev server: `npm run dev -- --port 3006`
- Open `/dashboard` and sign in with a test account.
- If Today is empty in development, tap `Seed demo moves`.

## Flow Checks
- Today shows the title `Today`, the outcome strip, and action sections.
- Demo actions appear for expiring credit, annual-fee review, and SUB pace.
- `Do it` opens the intended workflow:
  - credit action -> Benefits
  - renewal action -> Keep or Cancel
  - SUB action -> Wallet Challenges
- `Snooze` removes the action from Today.
- `Not useful` removes the action from Today.
- `Done` removes the action and increments completed moves.
- Refresh does not duplicate the same demo action recurrence keys.

## Mobile Checks
- Bottom nav primary tabs are Today, Ask, Benefits, Wallet, More.
- More contains Alerts, Best Card, Close Credits, Wallet Copilot, Keep or Cancel, Annual Fees, Fee Calc, and Settings.
- Action card buttons wrap without overlapping on a narrow viewport.

## Data Checks
```sql
select title, action_type, status, recurrence_key
from public.user_actions
where user_id = '<test-user-id>'
order by priority desc;
```

Expected statuses while testing: `active`, `started`, `completed`, `dismissed`, or `snoozed`.
