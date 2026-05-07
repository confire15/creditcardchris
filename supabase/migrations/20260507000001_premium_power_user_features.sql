-- Premium power-user feature foundations.
-- Manual-first tracking tables with RLS and public curated reference tables.

CREATE TABLE IF NOT EXISTS public.statement_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_card_id UUID REFERENCES public.user_cards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  annual_amount NUMERIC(10,2) NOT NULL,
  used_amount NUMERIC(10,2) DEFAULT 0 NOT NULL,
  reset_month INTEGER DEFAULT 1 NOT NULL,
  will_use BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.statement_credits ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'statement_credits'
      AND policyname = 'Users can manage their own statement credits'
  ) THEN
    CREATE POLICY "Users can manage their own statement credits"
      ON public.statement_credits FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.card_template_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_template_id UUID REFERENCES public.card_templates(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  annual_amount NUMERIC(10,2) NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'annual',
  category TEXT NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.card_template_credits ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'card_template_credits'
      AND policyname = 'Public read card_template_credits'
  ) THEN
    CREATE POLICY "Public read card_template_credits"
      ON public.card_template_credits FOR SELECT USING (true);
  END IF;
END $$;

ALTER TABLE public.statement_credits
  ADD COLUMN IF NOT EXISTS cadence TEXT DEFAULT 'annual',
  ADD COLUMN IF NOT EXISTS period_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS eligible_merchant_text TEXT,
  ADD COLUMN IF NOT EXISTS activation_hint TEXT,
  ADD COLUMN IF NOT EXISTS organic_value BOOLEAN DEFAULT true;

ALTER TABLE public.card_template_credits
  ADD COLUMN IF NOT EXISTS period_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS eligible_merchant_text TEXT,
  ADD COLUMN IF NOT EXISTS credit_activation_hint TEXT,
  ADD COLUMN IF NOT EXISTS organic_value BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  program_name TEXT NOT NULL,
  program_type TEXT NOT NULL DEFAULT 'airline',
  balance NUMERIC(14,2) DEFAULT 0 NOT NULL,
  point_value_cpp NUMERIC(5,2) DEFAULT 1.0 NOT NULL,
  expiration_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own loyalty accounts"
  ON public.loyalty_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_user_active
  ON public.loyalty_accounts(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_expiration
  ON public.loyalty_accounts(expiration_date) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.user_card_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_card_id UUID REFERENCES public.user_cards(id) ON DELETE CASCADE,
  merchant TEXT NOT NULL,
  offer_type TEXT NOT NULL DEFAULT 'statement_credit',
  value_amount NUMERIC(10,2),
  value_percent NUMERIC(5,2),
  minimum_spend NUMERIC(10,2),
  expires_on DATE,
  is_activated BOOLEAN DEFAULT false NOT NULL,
  is_used BOOLEAN DEFAULT false NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.user_card_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own card offers"
  ON public.user_card_offers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_card_offers_user_expires
  ON public.user_card_offers(user_id, expires_on) WHERE is_used = false;
CREATE INDEX IF NOT EXISTS idx_user_card_offers_card
  ON public.user_card_offers(user_card_id);

CREATE TABLE IF NOT EXISTS public.rotating_category_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_template_id UUID REFERENCES public.card_templates(id) ON DELETE CASCADE,
  issuer TEXT NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  category_name TEXT NOT NULL,
  multiplier NUMERIC(5,2) DEFAULT 5.0 NOT NULL,
  cap_amount NUMERIC(10,2) DEFAULT 1500,
  activation_url TEXT,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(card_template_id, year, quarter, category_name)
);

ALTER TABLE public.rotating_category_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rotating category periods"
  ON public.rotating_category_periods FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.user_rotating_category_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_card_id UUID REFERENCES public.user_cards(id) ON DELETE CASCADE NOT NULL,
  rotating_category_period_id UUID REFERENCES public.rotating_category_periods(id) ON DELETE CASCADE NOT NULL,
  is_activated BOOLEAN DEFAULT false NOT NULL,
  cap_spend NUMERIC(10,2) DEFAULT 0 NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_card_id, rotating_category_period_id)
);

ALTER TABLE public.user_rotating_category_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rotating category status"
  ON public.user_rotating_category_status FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.card_renewal_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_card_id UUID REFERENCES public.user_cards(id) ON DELETE CASCADE NOT NULL,
  annual_fee_posted_on DATE,
  refund_deadline DATE,
  retention_offer_value NUMERIC(10,2) DEFAULT 0,
  retention_offer_notes TEXT,
  decision TEXT DEFAULT 'undecided',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_card_id)
);

ALTER TABLE public.card_renewal_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own renewal reviews"
  ON public.card_renewal_reviews FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.card_protection_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_template_id UUID REFERENCES public.card_templates(id) ON DELETE CASCADE NOT NULL,
  protection_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  coverage_limit TEXT,
  claim_window TEXT,
  terms_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(card_template_id, protection_type)
);

ALTER TABLE public.card_protection_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read card protection templates"
  ON public.card_protection_templates FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.card_change_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_template_id UUID REFERENCES public.card_templates(id) ON DELETE CASCADE,
  issuer TEXT NOT NULL,
  title TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'benefit',
  summary TEXT NOT NULL,
  effective_on DATE,
  estimated_annual_impact NUMERIC(10,2),
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.card_change_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read card change events"
  ON public.card_change_events FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.user_card_change_dismissals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_change_event_id UUID REFERENCES public.card_change_events(id) ON DELETE CASCADE NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, card_change_event_id)
);

ALTER TABLE public.user_card_change_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own card change dismissals"
  ON public.user_card_change_dismissals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.household_card_instructions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_card_id UUID REFERENCES public.user_cards(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL DEFAULT 'Household note',
  instructions TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.household_card_instructions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own household card instructions"
  ON public.household_card_instructions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_household_card_instructions_card
  ON public.household_card_instructions(user_card_id) WHERE is_active = true;

INSERT INTO public.card_protection_templates
  (card_template_id, protection_type, summary, coverage_limit, claim_window, sort_order)
SELECT id, 'Rental car', 'Primary rental car coverage when eligible rentals are paid with this card.', 'Varies by rental and country', 'File promptly after incident', 1
FROM public.card_templates
WHERE name IN ('Chase Sapphire Reserve', 'Chase Sapphire Preferred', 'Capital One Venture X')
ON CONFLICT DO NOTHING;

INSERT INTO public.card_protection_templates
  (card_template_id, protection_type, summary, coverage_limit, claim_window, sort_order)
SELECT id, 'Trip delay', 'Trip delay reimbursement may apply after qualifying carrier delays.', 'Varies by card terms', 'Keep carrier delay proof and receipts', 2
FROM public.card_templates
WHERE name IN ('Chase Sapphire Reserve', 'Chase Sapphire Preferred', 'Amex Platinum Card')
ON CONFLICT DO NOTHING;

INSERT INTO public.card_protection_templates
  (card_template_id, protection_type, summary, coverage_limit, claim_window, sort_order)
SELECT id, 'Purchase protection', 'Eligible new purchases may be covered for accidental damage or theft.', 'Varies by item and card', 'Usually within 90 days', 3
FROM public.card_templates
WHERE name IN ('Amex Platinum Card', 'Amex Gold Card', 'Chase Sapphire Reserve', 'Capital One Venture X')
ON CONFLICT DO NOTHING;

INSERT INTO public.card_protection_templates
  (card_template_id, protection_type, summary, coverage_limit, claim_window, sort_order)
SELECT id, 'Extended warranty', 'Eligible purchases may receive extra warranty coverage when paid with this card.', 'Varies by manufacturer warranty and card terms', 'Keep original receipt and warranty documents', 4
FROM public.card_templates
WHERE name IN ('Amex Platinum Card', 'Amex Gold Card', 'Chase Sapphire Preferred', 'Chase Sapphire Reserve', 'Capital One Venture X')
ON CONFLICT DO NOTHING;

INSERT INTO public.card_protection_templates
  (card_template_id, protection_type, summary, coverage_limit, claim_window, sort_order)
SELECT id, 'Baggage delay', 'Reimbursement may apply for essential purchases when checked baggage is delayed on eligible trips.', 'Varies by card terms', 'Keep airline baggage delay documentation and receipts', 5
FROM public.card_templates
WHERE name IN ('Chase Sapphire Preferred', 'Chase Sapphire Reserve', 'Amex Platinum Card')
ON CONFLICT DO NOTHING;

INSERT INTO public.rotating_category_periods
  (card_template_id, issuer, year, quarter, category_name, multiplier, cap_amount, activation_url, starts_on, ends_on)
SELECT id, issuer, 2026, 2, 'Amazon and Whole Foods Market', 5.0, 1500.00, 'https://www.chase.com/personal/credit-cards/freedom/freedomfive', '2026-04-01', '2026-06-30'
FROM public.card_templates
WHERE name = 'Chase Freedom Flex'
ON CONFLICT DO NOTHING;

INSERT INTO public.rotating_category_periods
  (card_template_id, issuer, year, quarter, category_name, multiplier, cap_amount, activation_url, starts_on, ends_on)
SELECT id, issuer, 2026, 2, 'Chase Travel', 5.0, 1500.00, 'https://www.chase.com/personal/credit-cards/freedom/freedomfive', '2026-04-01', '2026-06-30'
FROM public.card_templates
WHERE name = 'Chase Freedom Flex'
ON CONFLICT DO NOTHING;

INSERT INTO public.rotating_category_periods
  (card_template_id, issuer, year, quarter, category_name, multiplier, cap_amount, activation_url, starts_on, ends_on)
SELECT id, issuer, 2026, 2, 'Feeding America donations', 5.0, 1500.00, 'https://www.chase.com/personal/credit-cards/freedom/freedomfive', '2026-04-01', '2026-06-30'
FROM public.card_templates
WHERE name = 'Chase Freedom Flex'
ON CONFLICT DO NOTHING;

INSERT INTO public.rotating_category_periods
  (card_template_id, issuer, year, quarter, category_name, multiplier, cap_amount, activation_url, starts_on, ends_on)
SELECT id, issuer, 2026, 2, 'Restaurants', 5.0, 1500.00, 'https://www.discover.com/', '2026-04-01', '2026-06-30'
FROM public.card_templates
WHERE name = 'Discover it Cash Back'
ON CONFLICT DO NOTHING;

INSERT INTO public.rotating_category_periods
  (card_template_id, issuer, year, quarter, category_name, multiplier, cap_amount, activation_url, starts_on, ends_on)
SELECT id, issuer, 2026, 2, 'Home Improvement Stores', 5.0, 1500.00, 'https://www.discover.com/', '2026-04-01', '2026-06-30'
FROM public.card_templates
WHERE name = 'Discover it Cash Back'
ON CONFLICT DO NOTHING;

INSERT INTO public.card_change_events
  (card_template_id, issuer, title, change_type, summary, effective_on, estimated_annual_impact, source_url)
SELECT id, issuer, 'Amex Platinum annual fee updated in card database', 'fee', 'Review your Platinum value assumptions against the current annual fee and coupon-book credits.', '2026-01-01', -200.00, NULL
FROM public.card_templates
WHERE name = 'Amex Platinum Card'
ON CONFLICT DO NOTHING;

INSERT INTO public.card_change_events
  (card_template_id, issuer, title, change_type, summary, effective_on, estimated_annual_impact, source_url)
SELECT id, issuer, 'Chase Freedom Q2 2026 categories active', 'reward', 'Amazon, Whole Foods Market, Chase Travel, and Feeding America are active through June 30 after activation.', '2026-04-01', 60.00, 'https://media.chase.com/news/chase-freedom-2026-q2-categories'
FROM public.card_templates
WHERE name = 'Chase Freedom Flex'
ON CONFLICT DO NOTHING;

INSERT INTO public.card_change_events
  (card_template_id, issuer, title, change_type, summary, effective_on, estimated_annual_impact, source_url)
SELECT id, issuer, 'Discover Q2 2026 categories active', 'reward', 'Restaurants and Home Improvement Stores are active through June 30 after activation.', '2026-04-01', 45.00, 'https://www.discover.com/'
FROM public.card_templates
WHERE name = 'Discover it Cash Back'
ON CONFLICT DO NOTHING;
