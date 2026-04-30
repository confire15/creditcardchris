# Security Runbook

## Authentication

Credit Card Chris uses Supabase Auth magic links and Google OAuth. The app must not store user passwords or password hashes in application tables. If password auth is added later, keep passwords inside Supabase Auth or another dedicated identity provider.

## Secrets

Keep secrets in `.env.local` for local development and in the deployment provider for production. `.env.local` is ignored by git; only `.env.example` should be tracked.

Run these checks before release:

```bash
npm run security:check
```

## Rotation

- Supabase service role key: rotate in Supabase, update `SUPABASE_SERVICE_ROLE_KEY`, redeploy, then revoke the old key.
- Supabase anon key: rotate in Supabase, update `NEXT_PUBLIC_SUPABASE_ANON_KEY`, redeploy clients, then revoke the old key.
- Cron secret: set the new value as `CRON_SECRET` and keep the old value temporarily in `CRON_SECRET_PREVIOUS` or `CRON_SECRETS`, update schedulers, then remove the old value.
- Stripe secret key: rotate in Stripe, update `STRIPE_SECRET_KEY`, redeploy, then expire the old key.
- Stripe webhook secret: create a new webhook signing secret, update `STRIPE_WEBHOOK_SECRET`, redeploy, then remove the old webhook secret.
- Resend, Twilio, Anthropic, and VAPID keys: create replacement credentials, update the matching environment variables, redeploy, verify delivery/API calls, then revoke the old credentials.

## Data Access

Allowed app data scope is the signed-in user plus accepted household members for read-only household views. Writes stay scoped to the signed-in user unless the route is explicitly household-owner management.

## Logging

Do not log request bodies, auth headers, cookies, tokens, push subscription keys, phone numbers, email addresses, or full third-party API objects. Use sanitized error helpers for server-side failures.
