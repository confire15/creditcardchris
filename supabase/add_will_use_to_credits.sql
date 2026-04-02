-- Add will_use flag to statement_credits
-- Tracks whether the user actually plans to use each credit.
-- Used by Keep or Cancel to calculate realistic vs. theoretical credit value.

ALTER TABLE statement_credits
  ADD COLUMN IF NOT EXISTS will_use BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN statement_credits.will_use IS
  'User indicated during onboarding or settings whether they plan to actually use this credit. FALSE = credit exists but is excluded from Keep or Cancel net value calculation.';
