-- ============================================
-- MORE CARD TEMPLATES (Batch 4) — 20 cards
-- ============================================
INSERT INTO public.card_templates (name, issuer, network, annual_fee, reward_type, reward_unit, base_reward_rate, color)
SELECT * FROM (VALUES
  -- Wells Fargo
  ('Wells Fargo Active Cash', 'Wells Fargo', 'Visa', 0.00, 'cashback', 'Cash Back', 2.0, '#d71e28'),
  ('Wells Fargo Autograph Journey', 'Wells Fargo', 'Visa', 95.00, 'points', 'Points', 1.0, '#a50021'),

  -- Citi
  ('Citi Strata Premier', 'Citi', 'Mastercard', 95.00, 'points', 'ThankYou Points', 1.0, '#002d72'),
  ('Citi Simplicity', 'Citi', 'Mastercard', 0.00, 'cashback', 'Cash Back', 0.0, '#4a4a4a'),

  -- Capital One
  ('Capital One Venture', 'Capital One', 'Visa', 95.00, 'miles', 'Capital One Miles', 2.0, '#005b8e'),
  ('Capital One SavorOne', 'Capital One', 'Mastercard', 0.00, 'cashback', 'Cash Back', 1.0, '#1a1a2e'),
  ('Capital One Spark Cash', 'Capital One', 'Visa', 95.00, 'cashback', 'Cash Back', 2.0, '#003d6b'),
  ('Capital One Spark Miles', 'Capital One', 'Visa', 95.00, 'miles', 'Capital One Miles', 2.0, '#00396b'),

  -- Chase
  ('Chase Freedom Rise', 'Chase', 'Visa', 0.00, 'cashback', 'Cash Back', 1.5, '#005eb8'),
  ('Chase British Airways Avios', 'Chase', 'Visa', 95.00, 'points', 'Avios', 1.0, '#003087'),
  ('Chase United Club Infinite', 'Chase', 'Visa', 525.00, 'miles', 'United MileagePlus', 1.0, '#00274d'),

  -- American Express
  ('Amex Marriott Bonvoy Business', 'American Express', 'Amex', 125.00, 'points', 'Marriott Bonvoy Points', 2.0, '#7a0019'),
  ('Amex Marriott Bonvoy Bevy', 'American Express', 'Amex', 250.00, 'points', 'Marriott Bonvoy Points', 2.0, '#6b0015'),
  ('Amex Delta SkyMiles Business Reserve', 'American Express', 'Amex', 650.00, 'miles', 'Delta SkyMiles', 1.5, '#0a0a0a'),

  -- Barclays
  ('JetBlue Business Card', 'Barclays', 'Mastercard', 99.00, 'points', 'TrueBlue Points', 1.0, '#00205b'),

  -- US Bank
  ('US Bank Business Triple Cash', 'US Bank', 'Visa', 0.00, 'cashback', 'Cash Back', 1.0, '#00205b'),

  -- Credit Unions
  ('PenFed Platinum Rewards Visa', 'Pentagon Federal CU', 'Visa', 0.00, 'points', 'Points', 1.0, '#0047ab'),

  -- Discover
  ('Discover it Student', 'Discover', 'Discover', 0.00, 'cashback', 'Cash Back', 1.0, '#f76420'),

  -- Other
  ('Upgrade Triple Cash Rewards', 'Upgrade', 'Visa', 0.00, 'cashback', 'Cash Back', 1.5, '#5b2d8e'),
  ('X1 Card', 'Lunafi', 'Visa', 0.00, 'points', 'Points', 2.0, '#1a1a1a')

) AS new_cards(name, issuer, network, annual_fee, reward_type, reward_unit, base_reward_rate, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.card_templates ct WHERE ct.name = new_cards.name
);

-- ============================================
-- REWARDS FOR NEW CARDS
-- ============================================

-- Wells Fargo Active Cash: 2% flat on everything (base rate handles it, no bonus cats)

-- Wells Fargo Autograph Journey: 5x hotels, 4x flights, 3x dining, transit, gas
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Wells Fargo Autograph Journey' AND sc.name IN ('hotels')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 4.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Wells Fargo Autograph Journey' AND sc.name IN ('flights', 'travel')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Wells Fargo Autograph Journey' AND sc.name IN ('dining', 'transit', 'gas')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Citi Strata Premier: 3x hotels, flights, dining, groceries, gas
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Citi Strata Premier' AND sc.name IN ('hotels', 'flights', 'travel', 'dining', 'groceries', 'gas')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Capital One Venture: 2x all (base rate handles it)

-- Capital One SavorOne: 3x dining, entertainment, streaming, groceries
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Capital One SavorOne' AND sc.name IN ('dining', 'entertainment', 'streaming', 'groceries')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Capital One Spark Cash: 2% flat (base rate handles it)

-- Capital One Spark Miles: 2x all (base rate handles it)

-- Chase British Airways Avios: 3x BA flights, 2x hotels, car rental
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase British Airways Avios' AND sc.name IN ('flights', 'travel')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase British Airways Avios' AND sc.name IN ('hotels')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Chase United Club Infinite: 4x United flights, 2x all travel & dining
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 4.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase United Club Infinite' AND sc.name IN ('flights')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase United Club Infinite' AND sc.name IN ('travel', 'hotels', 'transit', 'dining')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Amex Marriott Bonvoy Business: 6x Marriott, 4x dining/gas/wireless, 2x all
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 4.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Marriott Bonvoy Business' AND sc.name IN ('dining', 'gas', 'phone')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Amex Marriott Bonvoy Bevy: 6x Marriott, 4x dining/groceries, 2x all
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 4.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Marriott Bonvoy Bevy' AND sc.name IN ('dining', 'groceries')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Amex Delta SkyMiles Business Reserve: 3x Delta flights, 1.5x all
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Delta SkyMiles Business Reserve' AND sc.name IN ('flights', 'travel')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 1.5 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Delta SkyMiles Business Reserve' AND sc.name IN ('dining', 'hotels', 'transit')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- JetBlue Business: 6x JetBlue, 2x dining/office supply, 1x all
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'JetBlue Business Card' AND sc.name IN ('dining', 'office_supplies')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- US Bank Business Triple Cash: 3x gas, office supply, cell phone, restaurants
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'US Bank Business Triple Cash' AND sc.name IN ('gas', 'office_supplies', 'phone', 'dining')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- PenFed Platinum Rewards: 5x gas, 3x groceries
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'PenFed Platinum Rewards Visa' AND sc.name IN ('gas')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'PenFed Platinum Rewards Visa' AND sc.name IN ('groceries')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Discover it Student: 5x rotating categories (use dining as placeholder), 1x all
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Discover it Student' AND sc.name IN ('dining', 'groceries', 'gas', 'online_shopping')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- X1 Card: 2x all (base rate handles it), 3x on subscriptions/streaming
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'X1 Card' AND sc.name IN ('streaming', 'subscriptions', 'online_shopping')
ON CONFLICT (card_template_id, category_id) DO NOTHING;
