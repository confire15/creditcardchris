-- Tracks which credit-card news items have been posted to Slack to prevent dupes.
-- Service-role only (cron route); no user-facing RLS policies needed.

CREATE TABLE IF NOT EXISTS slack_news_sent (
  url       TEXT        PRIMARY KEY,
  title     TEXT        NOT NULL,
  category  TEXT        NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE slack_news_sent ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS slack_news_sent_posted_at_idx
  ON slack_news_sent (posted_at DESC);
