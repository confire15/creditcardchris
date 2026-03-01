-- ============================================
-- MORE CARD TEMPLATES (Batch 3) — 25 cards
-- ============================================
INSERT INTO public.card_templates (name, issuer, network, annual_fee, reward_type, reward_unit, base_reward_rate, color)
SELECT * FROM (VALUES
  -- Chase (5 new)
  ('Chase Aeroplan', 'Chase', 'Visa', 95.00, 'points', 'Aeroplan Points', 1.0, '#ba0018'),
  ('Chase United Gateway', 'Chase', 'Visa', 0.00, 'miles', 'United MileagePlus', 1.0, '#005daa'),
  ('Chase United Business Card', 'Chase', 'Visa', 99.00, 'miles', 'United MileagePlus', 1.0, '#00356b'),
  ('Chase Southwest Rapid Rewards Priority', 'Chase', 'Visa', 149.00, 'points', 'Rapid Rewards Points', 1.0, '#cc2222'),
  ('Chase World of Hyatt Business', 'Chase', 'Visa', 199.00, 'points', 'World of Hyatt Points', 1.0, '#0d2d5e'),

  -- American Express (6 new)
  ('Amex Delta SkyMiles Blue', 'American Express', 'Amex', 0.00, 'miles', 'Delta SkyMiles', 1.0, '#003087'),
  ('Amex Delta SkyMiles Reserve', 'American Express', 'Amex', 650.00, 'miles', 'Delta SkyMiles', 1.0, '#1c1c1c'),
  ('Amex Blue Business Cash', 'American Express', 'Amex', 0.00, 'cashback', 'Cash Back', 2.0, '#005f9e'),
  ('Amex Cash Magnet', 'American Express', 'Amex', 0.00, 'cashback', 'Cash Back', 1.5, '#1a4785'),
  ('Amex Marriott Bonvoy', 'American Express', 'Amex', 0.00, 'points', 'Marriott Bonvoy Points', 1.0, '#6d1919'),
  ('Amex Hilton Honors Business', 'American Express', 'Amex', 195.00, 'points', 'Hilton Honors Points', 3.0, '#001f5b'),

  -- Capital One (2 new)
  ('Capital One Spark Cash Plus', 'Capital One', 'Mastercard', 150.00, 'cashback', 'Cash Back', 2.0, '#b8860b'),
  ('Capital One Walmart Rewards Mastercard', 'Capital One', 'Mastercard', 0.00, 'cashback', 'Cash Back', 1.0, '#0071ce'),

  -- Citi (1 new)
  ('Citi AAdvantage MileUp', 'Citi', 'Mastercard', 0.00, 'miles', 'AAdvantage Miles', 1.0, '#0078d2'),

  -- Discover (2 new)
  ('Discover it Miles', 'Discover', 'Discover', 0.00, 'miles', 'Miles', 1.5, '#f76420'),
  ('Discover it Chrome', 'Discover', 'Discover', 0.00, 'cashback', 'Cash Back', 1.0, '#cc5500'),

  -- Bank of America (1 new)
  ('Bank of America Unlimited Cash Rewards', 'Bank of America', 'Visa', 0.00, 'cashback', 'Cash Back', 1.5, '#e31837'),

  -- US Bank (2 new)
  ('US Bank Altitude Connect', 'US Bank', 'Visa', 95.00, 'points', 'Points', 1.0, '#002d72'),
  ('US Bank Altitude Go', 'US Bank', 'Visa', 0.00, 'points', 'Points', 1.0, '#0072ce'),

  -- Barclays (2 new)
  ('Wyndham Rewards Earner Plus', 'Barclays', 'Mastercard', 75.00, 'points', 'Wyndham Rewards Points', 1.0, '#006ba6'),
  ('Wyndham Rewards Earner', 'Barclays', 'Mastercard', 0.00, 'points', 'Wyndham Rewards Points', 1.0, '#4a8ac4'),

  -- Chase (IHG no-fee + business ink) (2 more)
  ('IHG One Rewards Traveler', 'Chase', 'Mastercard', 0.00, 'points', 'IHG One Rewards Points', 1.0, '#007030'),
  ('Chase Ink Business Premier', 'Chase', 'Visa', 195.00, 'cashback', 'Cash Back', 2.0, '#2d2d2d'),

  -- Other issuers (2 new)
  ('Navy Federal More Rewards Amex', 'Navy Federal Credit Union', 'Amex', 0.00, 'points', 'Points', 1.0, '#002855'),
  ('Target Circle Card', 'Target', 'Mastercard', 0.00, 'cashback', 'Cash Back', 1.0, '#cc0000')

) AS new_cards(name, issuer, network, annual_fee, reward_type, reward_unit, base_reward_rate, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.card_templates ct WHERE ct.name = new_cards.name
);

-- ============================================
-- REWARDS FOR NEW CARDS
-- ============================================

-- Chase Aeroplan: 3x dining, flights, hotels
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Aeroplan' AND sc.name IN ('dining', 'flights', 'hotels')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Chase United Gateway: 2x United flights, dining, hotels
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase United Gateway' AND sc.name IN ('flights', 'dining', 'hotels')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Chase United Business Card: 2x flights, dining, hotels, gas, transit
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase United Business Card' AND sc.name IN ('flights', 'dining', 'hotels', 'gas', 'transit')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Chase Southwest Priority: 3x flights/hotels/car_rental, 2x dining/online_shopping
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Southwest Rapid Rewards Priority' AND sc.name IN ('flights', 'hotels', 'car_rental')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Southwest Rapid Rewards Priority' AND sc.name IN ('dining', 'online_shopping')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Chase World of Hyatt Business: 9x Hyatt hotels, 2x dining/flights/transit/car_rental
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 9.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase World of Hyatt Business' AND sc.name = 'hotels'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase World of Hyatt Business' AND sc.name IN ('dining', 'flights', 'transit', 'car_rental')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Amex Delta SkyMiles Blue: 2x Delta flights and dining
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Delta SkyMiles Blue' AND sc.name IN ('flights', 'dining')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Amex Delta SkyMiles Reserve: 3x Delta flights, 1.5x dining
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Delta SkyMiles Reserve' AND sc.name = 'flights'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 1.5 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Delta SkyMiles Reserve' AND sc.name = 'dining'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Amex Blue Business Cash: 2% on all (flat, base handles it)

-- Amex Cash Magnet: 1.5% on all (flat, base handles it)

-- Amex Marriott Bonvoy (no-fee): 3x Marriott hotels, 2x dining/gas
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Marriott Bonvoy' AND sc.name = 'hotels'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Marriott Bonvoy' AND sc.name IN ('dining', 'gas')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Amex Hilton Honors Business: 12x Hilton, 6x dining/flights/car_rental
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 12.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Hilton Honors Business' AND sc.name = 'hotels'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 6.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Hilton Honors Business' AND sc.name IN ('dining', 'flights', 'car_rental')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Capital One Spark Cash Plus: 5x hotels/car_rental (via Capital One Travel), 2% flat base
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Capital One Spark Cash Plus' AND sc.name IN ('hotels', 'car_rental')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Capital One Walmart Rewards: 5x Walmart.com, 2x Walmart/restaurants/travel/groceries
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Capital One Walmart Rewards Mastercard' AND sc.name = 'online_shopping'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Capital One Walmart Rewards Mastercard' AND sc.name IN ('dining', 'travel', 'groceries')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Citi AAdvantage MileUp: 2x American Airlines flights, groceries
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Citi AAdvantage MileUp' AND sc.name IN ('flights', 'groceries')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Discover it Miles: 1.5x everywhere (flat, base handles it)

-- Discover it Chrome: 2x gas and dining
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Discover it Chrome' AND sc.name IN ('gas', 'dining')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Bank of America Unlimited Cash Rewards: 1.5% flat (base handles it)

-- US Bank Altitude Connect: 5x hotels/car_rental, 4x flights/gas, 2x dining/streaming/groceries
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'US Bank Altitude Connect' AND sc.name IN ('hotels', 'car_rental')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 4.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'US Bank Altitude Connect' AND sc.name IN ('flights', 'gas')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'US Bank Altitude Connect' AND sc.name IN ('dining', 'streaming', 'groceries')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- US Bank Altitude Go: 4x dining, 2x groceries/gas/streaming
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 4.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'US Bank Altitude Go' AND sc.name = 'dining'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'US Bank Altitude Go' AND sc.name IN ('groceries', 'gas', 'streaming')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Wyndham Rewards Earner Plus: 6x Wyndham hotels, 4x gas/dining
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 6.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Wyndham Rewards Earner Plus' AND sc.name = 'hotels'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 4.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Wyndham Rewards Earner Plus' AND sc.name IN ('gas', 'dining')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Wyndham Rewards Earner (no-fee): 5x Wyndham hotels, 2x gas/dining
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Wyndham Rewards Earner' AND sc.name = 'hotels'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Wyndham Rewards Earner' AND sc.name IN ('gas', 'dining')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- IHG One Rewards Traveler (no-fee): 3x IHG hotels, 2x gas/groceries/dining
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'IHG One Rewards Traveler' AND sc.name = 'hotels'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'IHG One Rewards Traveler' AND sc.name IN ('gas', 'groceries', 'dining')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Chase Ink Business Premier: 5x hotels/flights (via Chase Travel), 2% flat base
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Ink Business Premier' AND sc.name IN ('hotels', 'flights')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Navy Federal More Rewards Amex: 3x gas/transit/dining, 2x groceries
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Navy Federal More Rewards Amex' AND sc.name IN ('gas', 'transit', 'dining')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Navy Federal More Rewards Amex' AND sc.name = 'groceries'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Target Circle Card: 5% at Target (mapped as online_shopping + home_improvement)
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Target Circle Card' AND sc.name IN ('online_shopping', 'home_improvement')
ON CONFLICT (card_template_id, category_id) DO NOTHING;
