-- ============================================
-- MORE CARD TEMPLATES (Batch 2)
-- ============================================
INSERT INTO public.card_templates (name, issuer, network, annual_fee, reward_type, reward_unit, base_reward_rate, color)
SELECT * FROM (VALUES
  -- American Express
  ('Amex Green Card', 'American Express', 'Amex', 150.00, 'points', 'Membership Rewards', 1.0, '#006a52'),
  ('Amex Blue Business Plus', 'American Express', 'Amex', 0.00, 'points', 'Membership Rewards', 2.0, '#007bc3'),
  ('Amex Business Gold', 'American Express', 'Amex', 375.00, 'points', 'Membership Rewards', 1.0, '#b8860b'),
  ('Amex Business Platinum', 'American Express', 'Amex', 695.00, 'points', 'Membership Rewards', 1.0, '#8a8a8a'),
  ('Amex Delta SkyMiles Gold', 'American Express', 'Amex', 150.00, 'miles', 'Delta SkyMiles', 1.0, '#003366'),
  ('Amex Delta SkyMiles Platinum', 'American Express', 'Amex', 350.00, 'miles', 'Delta SkyMiles', 1.0, '#1a1a6e'),
  ('Amex Hilton Honors', 'American Express', 'Amex', 0.00, 'points', 'Hilton Honors Points', 3.0, '#004f9f'),
  ('Amex Hilton Honors Surpass', 'American Express', 'Amex', 150.00, 'points', 'Hilton Honors Points', 3.0, '#00356b'),
  ('Amex Marriott Bonvoy Brilliant', 'American Express', 'Amex', 650.00, 'points', 'Marriott Bonvoy Points', 2.0, '#8b0000'),

  -- Chase Co-brands
  ('Chase Amazon Prime Rewards', 'Chase', 'Visa', 0.00, 'cashback', 'Cash Back', 1.0, '#ff9900'),
  ('Chase World of Hyatt', 'Chase', 'Visa', 95.00, 'points', 'World of Hyatt Points', 1.0, '#1a3c6e'),
  ('Chase Marriott Bonvoy Boundless', 'Chase', 'Visa', 95.00, 'points', 'Marriott Bonvoy Points', 2.0, '#8b0000'),
  ('Chase Marriott Bonvoy Bold', 'Chase', 'Visa', 0.00, 'points', 'Marriott Bonvoy Points', 1.0, '#a52a2a'),
  ('Chase IHG One Rewards Premier', 'Chase', 'Mastercard', 99.00, 'points', 'IHG One Rewards Points', 3.0, '#006400'),
  ('Chase Southwest Rapid Rewards Plus', 'Chase', 'Visa', 69.00, 'points', 'Rapid Rewards Points', 1.0, '#304cb2'),
  ('Chase United Explorer', 'Chase', 'Visa', 95.00, 'miles', 'United MileagePlus', 1.0, '#005daa'),

  -- Capital One
  ('Capital One VentureOne', 'Capital One', 'Visa', 0.00, 'miles', 'Capital One Miles', 1.25, '#004977'),
  ('Capital One Savor', 'Capital One', 'Mastercard', 95.00, 'cashback', 'Cash Back', 1.0, '#2b2d42'),

  -- Citi Co-brands
  ('Citi AAdvantage Platinum Select', 'Citi', 'Mastercard', 99.00, 'miles', 'AAdvantage Miles', 1.0, '#003b70'),
  ('Costco Anywhere Visa', 'Citi', 'Visa', 0.00, 'cashback', 'Cash Back', 1.0, '#005daa'),

  -- Airline & Hotel Co-brands
  ('JetBlue Plus Card', 'Barclays', 'Mastercard', 99.00, 'points', 'TrueBlue Points', 1.0, '#003876'),
  ('Alaska Airlines Visa Signature', 'Bank of America', 'Visa', 75.00, 'miles', 'Alaska Mileage Plan', 1.0, '#00557f'),

  -- Flat-rate & Others
  ('PayPal Cashback Mastercard', 'Synchrony', 'Mastercard', 0.00, 'cashback', 'Cash Back', 1.5, '#003087'),
  ('Alliant Cashback Visa Signature', 'Alliant Credit Union', 'Visa', 99.00, 'cashback', 'Cash Back', 2.5, '#c8102e'),
  ('Bread Cashback Amex', 'Bread Financial', 'Amex', 0.00, 'cashback', 'Cash Back', 2.0, '#ff6600'),
  ('SoFi Credit Card', 'SoFi', 'Mastercard', 0.00, 'cashback', 'Cash Back', 2.0, '#7c4dff'),
  ('Sam''s Club Mastercard', 'Synchrony', 'Mastercard', 0.00, 'cashback', 'Cash Back', 1.0, '#007dc6')
) AS new_cards(name, issuer, network, annual_fee, reward_type, reward_unit, base_reward_rate, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.card_templates ct WHERE ct.name = new_cards.name
);

-- ============================================
-- REWARDS FOR NEW CARDS
-- ============================================

-- Amex Green Card: 3x travel, transit, dining
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Green Card' AND sc.name IN ('travel', 'transit', 'dining', 'flights', 'hotels')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Amex Business Gold: 4x on 2 highest spend categories (dining, online, gas, transit, flights, advertising)
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 4.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Business Gold' AND sc.name IN ('dining', 'online_shopping', 'gas', 'transit', 'flights')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Amex Business Platinum: 5x flights/hotels via Amex Travel, 1.5x on $5k+ purchases
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Business Platinum' AND sc.name IN ('flights', 'hotels')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Amex Delta SkyMiles Gold: 2x Delta/restaurants/groceries
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Delta SkyMiles Gold' AND sc.name IN ('flights', 'dining', 'groceries')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Amex Delta SkyMiles Platinum: 3x Delta, 2x restaurants/groceries
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Delta SkyMiles Platinum' AND sc.name = 'flights'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Delta SkyMiles Platinum' AND sc.name IN ('dining', 'groceries')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Amex Hilton Honors: 7x Hilton, 5x dining/groceries/gas
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 7.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Hilton Honors' AND sc.name = 'hotels'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Hilton Honors' AND sc.name IN ('dining', 'groceries', 'gas')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Amex Hilton Honors Surpass: 12x Hilton, 6x dining/groceries/gas
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 12.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Hilton Honors Surpass' AND sc.name = 'hotels'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 6.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Hilton Honors Surpass' AND sc.name IN ('dining', 'groceries', 'gas')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Amex Marriott Bonvoy Brilliant: 6x Marriott, 3x dining/flights
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 6.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Marriott Bonvoy Brilliant' AND sc.name = 'hotels'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Marriott Bonvoy Brilliant' AND sc.name IN ('dining', 'flights')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Chase Amazon Prime: 5x Amazon/Whole Foods, 2x restaurants/gas/drugstores
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Amazon Prime Rewards' AND sc.name = 'online_shopping'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Amazon Prime Rewards' AND sc.name = 'groceries'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Amazon Prime Rewards' AND sc.name IN ('dining', 'gas', 'drugstores')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Chase World of Hyatt: 4x Hyatt hotels, 2x dining/flights/transit/fitness
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 4.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase World of Hyatt' AND sc.name = 'hotels'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase World of Hyatt' AND sc.name IN ('dining', 'flights', 'transit', 'entertainment')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Chase Marriott Bonvoy Boundless: 6x Marriott, 3x dining/gas/groceries/travel
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 6.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Marriott Bonvoy Boundless' AND sc.name = 'hotels'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Marriott Bonvoy Boundless' AND sc.name IN ('dining', 'gas', 'groceries', 'travel')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Chase Marriott Bonvoy Bold: 3x Marriott, 2x travel
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Marriott Bonvoy Bold' AND sc.name = 'hotels'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Marriott Bonvoy Bold' AND sc.name IN ('travel', 'flights')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Chase IHG Premier: 10x IHG, 5x dining/gas/groceries
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 10.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase IHG One Rewards Premier' AND sc.name = 'hotels'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase IHG One Rewards Premier' AND sc.name IN ('dining', 'gas', 'groceries')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Chase Southwest Plus: 2x Southwest/hotels/car rentals, 1x other
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Southwest Rapid Rewards Plus' AND sc.name IN ('flights', 'hotels', 'car_rental')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Chase United Explorer: 2x United/dining/hotels
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase United Explorer' AND sc.name IN ('flights', 'dining', 'hotels')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Capital One Savor: 4x dining/entertainment/streaming, 3x groceries
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 4.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Capital One Savor' AND sc.name IN ('dining', 'entertainment', 'streaming')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Capital One Savor' AND sc.name = 'groceries'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Citi AAdvantage Platinum: 2x AA/restaurants/gas
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Citi AAdvantage Platinum Select' AND sc.name IN ('flights', 'dining', 'gas')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Costco Anywhere Visa: 4x gas, 3x restaurants/travel, 2x Costco
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 4.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Costco Anywhere Visa' AND sc.name = 'gas'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Costco Anywhere Visa' AND sc.name IN ('dining', 'travel', 'flights', 'hotels')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- JetBlue Plus: 6x JetBlue, 2x dining/groceries
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 6.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'JetBlue Plus Card' AND sc.name = 'flights'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'JetBlue Plus Card' AND sc.name IN ('dining', 'groceries')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Alaska Airlines Visa: 3x Alaska, 2x gas/EV charging
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Alaska Airlines Visa Signature' AND sc.name = 'flights'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Alaska Airlines Visa Signature' AND sc.name = 'gas'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- PayPal Cashback: 3x PayPal, 1.5x other
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'PayPal Cashback Mastercard' AND sc.name = 'online_shopping'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Sam's Club Mastercard: 5x gas, 3x Sam's/dining/travel
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Sam''s Club Mastercard' AND sc.name = 'gas'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Sam''s Club Mastercard' AND sc.name IN ('dining', 'travel', 'groceries')
ON CONFLICT (card_template_id, category_id) DO NOTHING;
