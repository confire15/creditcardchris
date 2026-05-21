-- Annual Fee Calendar support.
-- Stores exact/estimated renewal metadata and per-card reminder preferences.

ALTER TABLE public.user_cards
  ADD COLUMN IF NOT EXISTS custom_annual_fee NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS account_opened_on DATE,
  ADD COLUMN IF NOT EXISTS annual_fee_date_source TEXT DEFAULT 'exact',
  ADD COLUMN IF NOT EXISTS annual_fee_reminders_enabled BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS annual_fee_reminder_days INTEGER[] DEFAULT ARRAY[30, 7, 1]::INTEGER[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_cards_annual_fee_date_source_check'
  ) THEN
    ALTER TABLE public.user_cards
      ADD CONSTRAINT user_cards_annual_fee_date_source_check
      CHECK (
        annual_fee_date_source IS NULL
        OR annual_fee_date_source IN ('exact', 'estimated_from_opened_on', 'unknown')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_cards_annual_fee_calendar
  ON public.user_cards(user_id, annual_fee_date)
  WHERE is_active = true;
