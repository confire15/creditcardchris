-- ============================================
-- MORE CARD TEMPLATES (Batch 5) — 20 cards
-- ============================================
INSERT INTO public.card_templates (name, issuer, network, annual_fee, reward_type, reward_unit, base_reward_rate, color)
SELECT * FROM (VALUES
  -- Chase Airlines
  ('Chase Southwest Rapid Rewards Priority', 'Chase', 'Visa', 149.00, 'points', 'Rapid Rewards Points', 1.0, '#304cb2'),
  ('Chase Southwest Rapid Rewards Premier', 'Chase', 'Visa', 99.00, 'points', 'Rapid Rewards Points', 1.0, '#005eb8'),
  ('Chase United Gateway', 'Chase', 'Visa', 0.00, 'miles', 'United MileagePlus', 1.0, '#00569c'),
  ('Chase Aeroplan', 'Chase', 'Visa', 95.00, 'points', 'Aeroplan Points', 1.0, '#c60c30'),

  -- American Express
  ('Amex Delta SkyMiles Reserve', 'American Express', 'Amex', 650.00, 'miles', 'Delta SkyMiles', 1.0, '#1c1c1e'),
  ('Amex Hilton Honors Aspire', 'American Express', 'Amex', 550.00, 'points', 'Hilton Honors Points', 3.0, '#001f5b'),

  -- Capital One Business
  ('Capital One Venture X Business', 'Capital One', 'Visa', 395.00, 'miles', 'Capital One Miles', 2.0, '#003153'),
  ('Capital One Spark 1.5% Cash Select', 'Capital One', 'Visa', 0.00, 'cashback', 'Cash Back', 1.5, '#004b87'),

  -- Citi
  ('Citi AAdvantage Executive', 'Citi', 'Mastercard', 595.00, 'miles', 'AAdvantage Miles', 1.0, '#001f5b'),

  -- Barclays
  ('Barclays Arrival+', 'Barclays', 'Mastercard', 89.00, 'miles', 'Miles', 2.0, '#00395d'),
  ('Barclays Wyndham Rewards Earner Plus', 'Barclays', 'Visa', 75.00, 'points', 'Wyndham Rewards Points', 1.0, '#0076a3'),

  -- Bank of America
  ('Bank of America Unlimited Cash Rewards', 'Bank of America', 'Visa', 0.00, 'cashback', 'Cash Back', 1.5, '#b22222'),
  ('Bank of America Business Advantage Cash', 'Bank of America', 'Visa', 0.00, 'cashback', 'Cash Back', 1.0, '#c41e3a'),

  -- US Bank
  ('US Bank Altitude Connect', 'US Bank', 'Visa', 95.00, 'points', 'Points', 1.0, '#003087'),

  -- Discover
  ('Discover it Miles', 'Discover', 'Discover', 0.00, 'miles', 'Miles', 1.5, '#f7931e'),

  -- Credit Unions & Others
  ('Navy Federal cashRewards', 'Navy Federal Credit Union', 'Visa', 0.00, 'cashback', 'Cash Back', 1.5, '#003366'),
  ('USAA Preferred Cash Rewards', 'USAA', 'Visa', 0.00, 'cashback', 'Cash Back', 1.5, '#002663'),
  ('TD Bank Double Up', 'TD Bank', 'Visa', 0.00, 'cashback', 'Cash Back', 2.0, '#00b140'),

  -- Amazon
  ('Amazon Business Prime Card', 'Chase', 'Visa', 0.00, 'cashback', 'Cash Back', 1.0, '#ff9900'),

  -- US Bank Shopper
  ('US Bank Shopper Cash Rewards', 'US Bank', 'Visa', 95.00, 'cashback', 'Cash Back', 1.5, '#1a237e')

) AS new_cards(name, issuer, network, annual_fee, reward_type, reward_unit, base_reward_rate, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.card_templates ct WHERE ct.name = new_cards.name
);

-- ============================================
-- REWARDS FOR BATCH 5 CARDS
-- ============================================
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier, cap_amount)
SELECT ct.id, sc.id, r.multiplier, r.cap
FROM (VALUES
  -- Chase Southwest Priority: 3x SW, 2x hotel/car, 1x else
  ('Chase Southwest Rapid Rewards Priority', 'travel', 2.0, NULL),
  ('Chase Southwest Rapid Rewards Priority', 'hotels', 2.0, NULL),

  -- Chase Southwest Premier: 3x SW, 2x hotel, 1x else
  ('Chase Southwest Rapid Rewards Premier', 'travel', 2.0, NULL),
  ('Chase Southwest Rapid Rewards Premier', 'hotels', 2.0, NULL),

  -- Chase United Gateway: 2x United/dining/gas
  ('Chase United Gateway', 'dining', 2.0, NULL),
  ('Chase United Gateway', 'gas', 2.0, NULL),
  ('Chase United Gateway', 'travel', 2.0, NULL),

  -- Chase Aeroplan: 3x groceries/dining/Air Canada
  ('Chase Aeroplan', 'dining', 3.0, NULL),
  ('Chase Aeroplan', 'groceries', 3.0, NULL),
  ('Chase Aeroplan', 'travel', 3.0, NULL),

  -- Amex Delta Reserve: 3x Delta, 1x else
  ('Amex Delta SkyMiles Reserve', 'travel', 3.0, NULL),

  -- Amex Hilton Aspire: 14x Hilton, 7x flights/car/dining, 3x else
  ('Amex Hilton Honors Aspire', 'hotels', 14.0, NULL),
  ('Amex Hilton Honors Aspire', 'travel', 7.0, NULL),
  ('Amex Hilton Honors Aspire', 'dining', 7.0, NULL),

  -- Capital One Venture X Business: 10x hotels/cars via portal, 5x flights, 2x else
  ('Capital One Venture X Business', 'hotels', 10.0, NULL),
  ('Capital One Venture X Business', 'travel', 5.0, NULL),

  -- Citi AAdvantage Executive: 10x AA, 4x hotels, 3x transit, 2x dining/gas
  ('Citi AAdvantage Executive', 'travel', 10.0, NULL),
  ('Citi AAdvantage Executive', 'hotels', 4.0, NULL),
  ('Citi AAdvantage Executive', 'transit', 3.0, NULL),
  ('Citi AAdvantage Executive', 'dining', 2.0, NULL),
  ('Citi AAdvantage Executive', 'gas', 2.0, NULL),

  -- Barclays Arrival+: 2x everywhere
  ('Barclays Arrival+', 'dining', 2.0, NULL),
  ('Barclays Arrival+', 'groceries', 2.0, NULL),
  ('Barclays Arrival+', 'travel', 2.0, NULL),
  ('Barclays Arrival+', 'gas', 2.0, NULL),

  -- Barclays Wyndham: 6x Wyndham, 4x gas/groceries
  ('Barclays Wyndham Rewards Earner Plus', 'hotels', 6.0, NULL),
  ('Barclays Wyndham Rewards Earner Plus', 'gas', 4.0, NULL),
  ('Barclays Wyndham Rewards Earner Plus', 'groceries', 4.0, NULL),

  -- BofA Business Advantage: 3% in chosen category, 2% dining
  ('Bank of America Business Advantage Cash', 'dining', 2.0, NULL),
  ('Bank of America Business Advantage Cash', 'online_shopping', 3.0, NULL),

  -- US Bank Altitude Connect: 5x travel portal, 4x travel/gas, 2x dining/streaming
  ('US Bank Altitude Connect', 'travel', 4.0, NULL),
  ('US Bank Altitude Connect', 'gas', 4.0, NULL),
  ('US Bank Altitude Connect', 'dining', 2.0, NULL),
  ('US Bank Altitude Connect', 'streaming', 2.0, NULL),

  -- Amazon Business Prime: 5% Amazon/AWS, 2% restaurants/gas/phone
  ('Amazon Business Prime Card', 'online_shopping', 5.0, NULL),
  ('Amazon Business Prime Card', 'dining', 2.0, NULL),
  ('Amazon Business Prime Card', 'gas', 2.0, NULL),

  -- US Bank Shopper: 6% in top 2 stores, 3% home utilities, 1.5% else
  ('US Bank Shopper Cash Rewards', 'online_shopping', 6.0, NULL),
  ('US Bank Shopper Cash Rewards', 'groceries', 3.0, NULL)

) AS r(card_name, category_name, multiplier, cap)
JOIN public.card_templates ct ON ct.name = r.card_name
JOIN public.spending_categories sc ON sc.name = r.category_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.card_template_rewards ctr
  WHERE ctr.card_template_id = ct.id AND ctr.category_id = sc.id
);
