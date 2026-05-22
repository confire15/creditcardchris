-- Tracks which onboarding drip email stages have been sent to each user.
-- Prevents duplicate sends. Only accessed via the service role client in cron routes;
-- no user-facing RLS policies are needed (service role bypasses RLS).

CREATE TABLE IF NOT EXISTS drip_emails_sent (
  id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage   TEXT        NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, stage)
);

ALTER TABLE drip_emails_sent ENABLE ROW LEVEL SECURITY;
