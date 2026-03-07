-- Card Perks Tracker
-- Tracks premium credit card perks (credits, lounge access, free nights, etc.)
-- with usage tracking and push notification reminders before reset.

-- ============================================================
-- TABLE: card_perk_templates (reference, public read)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.card_perk_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_template_id UUID REFERENCES public.card_templates(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  perk_type TEXT NOT NULL DEFAULT 'credit',    -- 'credit' | 'lounge' | 'free_night' | 'status' | 'other'
  value_type TEXT NOT NULL DEFAULT 'dollar',   -- 'dollar' | 'count' | 'boolean'
  annual_value NUMERIC(10,2),                  -- total $ available (e.g. 300.00)
  annual_count INTEGER,                        -- total uses (e.g. 2 free nights)
  reset_cadence TEXT NOT NULL DEFAULT 'annual',-- 'monthly' | 'annual' | 'calendar_year'
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.card_perk_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read card_perk_templates"
  ON public.card_perk_templates FOR SELECT USING (true);

-- ============================================================
-- TABLE: card_perks (user-scoped)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.card_perks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_card_id UUID REFERENCES public.user_cards(id) ON DELETE CASCADE NOT NULL,
  card_perk_template_id UUID REFERENCES public.card_perk_templates(id) ON DELETE SET NULL,
  -- Core fields
  name TEXT NOT NULL,
  description TEXT,
  perk_type TEXT NOT NULL DEFAULT 'credit',
  value_type TEXT NOT NULL DEFAULT 'dollar',
  annual_value NUMERIC(10,2),
  annual_count INTEGER,
  -- Usage tracking
  used_value NUMERIC(10,2) DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  is_redeemed BOOLEAN DEFAULT false,
  -- Reset config
  reset_cadence TEXT NOT NULL DEFAULT 'annual',
  reset_month INTEGER DEFAULT 1,
  last_reset_at DATE,
  -- Notification config
  notify_before_reset BOOLEAN DEFAULT true,
  notify_days_before INTEGER DEFAULT 30,
  -- Meta
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.card_perks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own perks"
  ON public.card_perks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_card_perks_user_id ON public.card_perks(user_id);
CREATE INDEX IF NOT EXISTS idx_card_perks_user_card_id ON public.card_perks(user_card_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_card_perks_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER card_perks_updated_at
  BEFORE UPDATE ON public.card_perks
  FOR EACH ROW EXECUTE FUNCTION update_card_perks_updated_at();

-- ============================================================
-- SEED: Perk templates for top premium cards
-- ============================================================

-- American Express Platinum Card ($695/yr)
INSERT INTO public.card_perk_templates
  (card_template_id, name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
SELECT ct.id, v.name, v.description, v.perk_type, v.value_type, v.annual_value, v.reset_cadence, v.sort_order
FROM public.card_templates ct
CROSS JOIN (VALUES
  ('$200 Hotel Credit',           'Prepaid bookings at Fine Hotels + Resorts via Amex Travel',      'credit',   'dollar', 200.00, 'calendar_year', 1),
  ('$200 Airline Fee Credit',     'Incidental fees on your one selected airline',                   'credit',   'dollar', 200.00, 'calendar_year', 2),
  ('$240 Digital Entertainment',  '$20/mo for eligible streaming: Disney+, Hulu, ESPN+, etc.',      'credit',   'dollar', 240.00, 'annual',         3),
  ('$200 Uber Cash',              '$15/mo Uber + Uber Eats ($20 in December)',                      'credit',   'dollar', 200.00, 'annual',         4),
  ('$155 Walmart+ Credit',        '$12.95/mo Walmart+ membership reimbursement',                    'credit',   'dollar', 155.00, 'annual',         5),
  ('$300 Equinox Credit',         '$25/mo Equinox gym membership',                                  'credit',   'dollar', 300.00, 'annual',         6),
  ('$100 Saks Fifth Avenue',      '$50 Jan–Jun + $50 Jul–Dec',                                      'credit',   'dollar', 100.00, 'annual',         7),
  ('$189 CLEAR Plus Credit',      'Annual CLEAR Plus membership reimbursement',                     'credit',   'dollar', 189.00, 'calendar_year', 8),
  ('Global Entry / TSA PreCheck', '$120 Global Entry or $85 TSA PreCheck every 4.5 years',          'credit',   'dollar', 120.00, 'annual',         9),
  ('Global Lounge Collection',    'Centurion, Priority Pass, Delta Sky Club, and more',              'lounge',  'boolean', NULL,   'annual',        10)
) AS v(name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
WHERE ct.name = 'American Express Platinum Card';

-- American Express Gold Card ($325/yr)
INSERT INTO public.card_perk_templates
  (card_template_id, name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
SELECT ct.id, v.name, v.description, v.perk_type, v.value_type, v.annual_value, v.reset_cadence, v.sort_order
FROM public.card_templates ct
CROSS JOIN (VALUES
  ('$120 Dining Credit',   '$10/mo at Grubhub, Seamless, The Cheesecake Factory, and more', 'credit', 'dollar', 120.00, 'annual', 1),
  ('$120 Uber Cash',       '$10/mo Uber Cash for Uber Eats or Uber rides',                  'credit', 'dollar', 120.00, 'annual', 2),
  ('$84 Dunkin'' Credit',  '$7/mo at Dunkin'' enrolled locations',                          'credit', 'dollar',  84.00, 'annual', 3),
  ('$100 Resy Credit',     '$50 Jan–Jun + $50 Jul–Dec at Resy restaurants',                 'credit', 'dollar', 100.00, 'annual', 4)
) AS v(name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
WHERE ct.name = 'American Express Gold Card';

-- Chase Sapphire Reserve ($550/yr)
INSERT INTO public.card_perk_templates
  (card_template_id, name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
SELECT ct.id, v.name, v.description, v.perk_type, v.value_type, v.annual_value, v.reset_cadence, v.sort_order
FROM public.card_templates ct
CROSS JOIN (VALUES
  ('$300 Travel Credit',        'Automatic credit for any travel purchase each year',              'credit', 'dollar', 300.00, 'annual', 1),
  ('$60 DoorDash Credit',       '$5/mo DashPass credit at DoorDash',                              'credit', 'dollar',  60.00, 'annual', 2),
  ('$180 Instacart+ Credit',    '$15/mo Instacart+ subscription',                                 'credit', 'dollar', 180.00, 'annual', 3),
  ('Global Entry / TSA PreCheck','$100 Global Entry or $85 TSA PreCheck every 4 years',           'credit', 'dollar', 100.00, 'annual', 4),
  ('Priority Pass Lounge',      'Unlimited Priority Pass Select lounge access',                   'lounge', 'boolean', NULL, 'annual', 5)
) AS v(name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
WHERE ct.name = 'Chase Sapphire Reserve';

-- Capital One Venture X ($395/yr)
INSERT INTO public.card_perk_templates
  (card_template_id, name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
SELECT ct.id, v.name, v.description, v.perk_type, v.value_type, v.annual_value, v.reset_cadence, v.sort_order
FROM public.card_templates ct
CROSS JOIN (VALUES
  ('$300 Travel Credit',        'Annual credit for Capital One Travel bookings',                  'credit', 'dollar', 300.00, 'annual', 1),
  ('10,000 Anniversary Miles',  '~$100 bonus miles each anniversary year',                        'credit', 'dollar', 100.00, 'annual', 2),
  ('Global Entry / TSA PreCheck','$100 Global Entry or $85 TSA PreCheck',                         'credit', 'dollar', 100.00, 'annual', 3),
  ('Priority Pass Lounge',      'Unlimited Priority Pass lounge access + 2 guests free',          'lounge', 'boolean', NULL, 'annual', 4),
  ('Capital One Lounge',        'Unlimited access to Capital One Lounges',                        'lounge', 'boolean', NULL, 'annual', 5)
) AS v(name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
WHERE ct.name = 'Capital One Venture X';

-- Chase Sapphire Preferred ($95/yr)
INSERT INTO public.card_perk_templates
  (card_template_id, name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
SELECT ct.id, v.name, v.description, v.perk_type, v.value_type, v.annual_value, v.reset_cadence, v.sort_order
FROM public.card_templates ct
CROSS JOIN (VALUES
  ('$50 Hotel Credit',     'Annual $50 credit for hotel stays booked through Chase Travel', 'credit', 'dollar', 50.00, 'annual', 1),
  ('DoorDash DashPass',    'Complimentary DashPass subscription through 2027',              'other',  'boolean', NULL, 'annual', 2)
) AS v(name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
WHERE ct.name = 'Chase Sapphire Preferred';

-- Amex Marriott Bonvoy Brilliant ($650/yr)
INSERT INTO public.card_perk_templates
  (card_template_id, name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
SELECT ct.id, v.name, v.description, v.perk_type, v.value_type, v.annual_value, v.reset_cadence, v.sort_order
FROM public.card_templates ct
CROSS JOIN (VALUES
  ('$300 Dining Credit',         '$25/mo at restaurants worldwide',                                    'credit',     'dollar', 300.00, 'annual', 1),
  ('1 Free Night Award',         'Annual free night certificate up to 85,000 Marriott Bonvoy points',  'free_night', 'count',  NULL,   'annual', 2),
  ('$100 Marriott Property Credit','$100 on qualifying 2-night stays at Ritz-Carlton or St. Regis',   'credit',     'dollar', 100.00, 'annual', 3),
  ('Marriott Bonvoy Platinum',   'Automatic Marriott Bonvoy Platinum Elite status',                   'status',     'boolean', NULL,  'annual', 4),
  ('Priority Pass Lounge',       'Unlimited Priority Pass Select lounge access',                      'lounge',     'boolean', NULL,  'annual', 5)
) AS v(name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
WHERE ct.name = 'Amex Marriott Bonvoy Brilliant';

-- Amex Hilton Honors Aspire ($550/yr)
INSERT INTO public.card_perk_templates
  (card_template_id, name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
SELECT ct.id, v.name, v.description, v.perk_type, v.value_type, v.annual_value, v.reset_cadence, v.sort_order
FROM public.card_templates ct
CROSS JOIN (VALUES
  ('$400 Hilton Resort Credit',  '$200 semi-annual credit at Hilton Resort Collection properties',   'credit',     'dollar', 400.00, 'annual', 1),
  ('$200 Flight Credit',         '$50/quarter on flights booked directly or via amextravel.com',     'credit',     'dollar', 200.00, 'annual', 2),
  ('2 Free Night Awards',        'Two annual free night certificates at Hilton properties',          'free_night', 'count',  NULL,   'annual', 3),
  ('Hilton Diamond Status',      'Automatic Hilton Honors Diamond status',                           'status',     'boolean', NULL,  'annual', 4),
  ('Priority Pass Lounge',       'Unlimited Priority Pass Select lounge access',                     'lounge',     'boolean', NULL,  'annual', 5)
) AS v(name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
WHERE ct.name = 'Amex Hilton Honors Aspire';

-- Amex Delta SkyMiles Platinum ($350/yr)
INSERT INTO public.card_perk_templates
  (card_template_id, name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
SELECT ct.id, v.name, v.description, v.perk_type, v.value_type, v.annual_value, v.reset_cadence, v.sort_order
FROM public.card_templates ct
CROSS JOIN (VALUES
  ('Companion Certificate',  'Annual domestic main cabin companion ticket',                  'other',  'boolean', NULL, 'annual', 1),
  ('$150 Delta Credit',      '$150 rounding statement credit toward Delta purchases',        'credit', 'dollar', 150.00, 'annual', 2),
  ('Global Entry / TSA PreCheck','$100 Global Entry or $85 TSA PreCheck credit',             'credit', 'dollar', 100.00, 'annual', 3),
  ('First Bag Free',         'Free first checked bag for you and up to 8 companions',       'other',  'boolean', NULL, 'annual', 4),
  ('Delta Sky Club Access',  '10 complimentary Sky Club visits per year',                   'lounge', 'count',  NULL, 'annual', 5)
) AS v(name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
WHERE ct.name = 'Amex Delta SkyMiles Platinum';

-- Chase United Club Infinite ($525/yr)
INSERT INTO public.card_perk_templates
  (card_template_id, name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
SELECT ct.id, v.name, v.description, v.perk_type, v.value_type, v.annual_value, v.reset_cadence, v.sort_order
FROM public.card_templates ct
CROSS JOIN (VALUES
  ('United Club Membership',     'Full United Club + Star Alliance lounge access + 2 guests',       'lounge',  'boolean', NULL,   'annual', 1),
  ('$125 United Credit',         'Annual statement credit toward United purchases',                 'credit',  'dollar', 125.00, 'annual', 2),
  ('Global Entry / TSA PreCheck','$100 Global Entry or $85 TSA PreCheck credit',                   'credit',  'dollar', 100.00, 'annual', 3),
  ('First + Second Bag Free',    'Free first and second checked bags for you and a companion',      'other',   'boolean', NULL,  'annual', 4)
) AS v(name, description, perk_type, value_type, annual_value, reset_cadence, sort_order)
WHERE ct.name = 'Chase United Club Infinite';
