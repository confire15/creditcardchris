-- ============================================
-- NEW CARD TEMPLATES
-- ============================================
INSERT INTO public.card_templates (name, issuer, network, annual_fee, reward_type, reward_unit, base_reward_rate, color)
SELECT * FROM (VALUES
  ('Amex Blue Cash Preferred', 'American Express', 'Amex', 95.00, 'cashback', 'Cash Back', 1.0, '#007bc3'),
  ('Amex Blue Cash Everyday', 'American Express', 'Amex', 0.00, 'cashback', 'Cash Back', 1.0, '#4ab3f4'),
  ('Amex EveryDay Preferred', 'American Express', 'Amex', 95.00, 'points', 'Membership Rewards', 1.0, '#006fcf'),
  ('Citi Premier', 'Citi', 'Mastercard', 95.00, 'points', 'ThankYou Points', 1.0, '#003b70'),
  ('Citi Custom Cash', 'Citi', 'Mastercard', 0.00, 'cashback', 'Cash Back', 1.0, '#003b70'),
  ('Citi Rewards+', 'Citi', 'Mastercard', 0.00, 'points', 'ThankYou Points', 1.0, '#002d72'),
  ('Bank of America Customized Cash Rewards', 'Bank of America', 'Visa', 0.00, 'cashback', 'Cash Back', 1.0, '#e31837'),
  ('Bank of America Premium Rewards', 'Bank of America', 'Visa', 95.00, 'points', 'Points', 1.5, '#c0141c'),
  ('Bank of America Travel Rewards', 'Bank of America', 'Visa', 0.00, 'points', 'Points', 1.5, '#d91b23'),
  ('Chase Ink Business Cash', 'Chase', 'Visa', 0.00, 'cashback', 'Ultimate Rewards', 1.0, '#004b87'),
  ('Chase Ink Business Preferred', 'Chase', 'Visa', 95.00, 'points', 'Ultimate Rewards', 1.0, '#1a3c6e'),
  ('Chase Ink Business Unlimited', 'Chase', 'Visa', 0.00, 'cashback', 'Ultimate Rewards', 1.5, '#004b87'),
  ('Capital One Quicksilver', 'Capital One', 'Visa', 0.00, 'cashback', 'Cash Back', 1.5, '#004977'),
  ('Bilt Mastercard', 'Bilt', 'Mastercard', 0.00, 'points', 'Bilt Points', 1.0, '#1a1a1a'),
  ('Wells Fargo Autograph', 'Wells Fargo', 'Visa', 0.00, 'points', 'Points', 1.0, '#d71e28'),
  ('US Bank Cash+', 'US Bank', 'Visa', 0.00, 'cashback', 'Cash Back', 1.0, '#003087'),
  ('US Bank Altitude Reserve', 'US Bank', 'Visa', 400.00, 'points', 'Points', 1.0, '#1a237e'),
  ('Apple Card', 'Apple', 'Mastercard', 0.00, 'cashback', 'Daily Cash', 1.0, '#1d1d1f'),
  ('Fidelity Rewards Visa Signature', 'Fidelity', 'Visa', 0.00, 'cashback', 'Cash Back', 2.0, '#49a942'),
  ('Robinhood Gold Card', 'Robinhood', 'Mastercard', 60.00, 'cashback', 'Cash Back', 3.0, '#00c805')
) AS new_cards(name, issuer, network, annual_fee, reward_type, reward_unit, base_reward_rate, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.card_templates ct WHERE ct.name = new_cards.name
);

-- ============================================
-- CARD TEMPLATE REWARDS (category multipliers)
-- ============================================

-- Amex Blue Cash Preferred: 6x groceries, 6x streaming, 3x gas, 3x transit
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 6.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Blue Cash Preferred' AND sc.name = 'groceries'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 6.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Blue Cash Preferred' AND sc.name = 'streaming'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Blue Cash Preferred' AND sc.name = 'gas'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Blue Cash Preferred' AND sc.name = 'transit'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Amex Blue Cash Everyday: 3x groceries, 3x gas, 3x online shopping
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex Blue Cash Everyday' AND sc.name IN ('groceries', 'gas', 'online_shopping')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Amex EveryDay Preferred: 4.5x groceries, 3x gas
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 4.5 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex EveryDay Preferred' AND sc.name = 'groceries'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Amex EveryDay Preferred' AND sc.name = 'gas'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Citi Premier: 3x dining, groceries, gas, hotels, flights
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Citi Premier' AND sc.name IN ('dining', 'groceries', 'gas', 'hotels', 'flights')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Citi Custom Cash: 5x on top eligible category
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Citi Custom Cash' AND sc.name IN ('dining', 'groceries', 'gas', 'streaming', 'drugstores', 'home_improvement')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Citi Rewards+: 2x groceries, 2x gas
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Citi Rewards+' AND sc.name IN ('groceries', 'gas')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Bank of America Customized Cash Rewards: 3x choice (dining/gas/online), 2x groceries
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Bank of America Customized Cash Rewards' AND sc.name IN ('dining', 'gas', 'online_shopping')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Bank of America Customized Cash Rewards' AND sc.name = 'groceries'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Bank of America Premium Rewards: 2x travel, dining, flights, hotels
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Bank of America Premium Rewards' AND sc.name IN ('travel', 'dining', 'flights', 'hotels')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Chase Ink Business Cash: 5x online/streaming, 2x gas/dining
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Ink Business Cash' AND sc.name IN ('online_shopping', 'streaming')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Ink Business Cash' AND sc.name IN ('gas', 'dining')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Chase Ink Business Preferred: 3x travel, transit, online shopping
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Chase Ink Business Preferred' AND sc.name IN ('travel', 'flights', 'hotels', 'transit', 'online_shopping')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Bilt Mastercard: 3x dining, 2x travel
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Bilt Mastercard' AND sc.name = 'dining'
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Bilt Mastercard' AND sc.name IN ('travel', 'flights', 'hotels', 'transit')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Wells Fargo Autograph: 3x dining, gas, travel, transit, streaming, flights, hotels
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 3.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Wells Fargo Autograph' AND sc.name IN ('dining', 'gas', 'travel', 'transit', 'streaming', 'flights', 'hotels')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- US Bank Cash+: 5x streaming/home improvement, 2x groceries/gas
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'US Bank Cash+' AND sc.name IN ('streaming', 'home_improvement')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'US Bank Cash+' AND sc.name IN ('groceries', 'gas')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- US Bank Altitude Reserve: 5x travel, transit, flights, hotels
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 5.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'US Bank Altitude Reserve' AND sc.name IN ('travel', 'transit', 'flights', 'hotels')
ON CONFLICT (card_template_id, category_id) DO NOTHING;

-- Apple Card: 2x dining, transit, groceries (Apple Pay merchants)
INSERT INTO public.card_template_rewards (card_template_id, category_id, multiplier)
SELECT ct.id, sc.id, 2.0 FROM public.card_templates ct, public.spending_categories sc
WHERE ct.name = 'Apple Card' AND sc.name IN ('dining', 'transit', 'groceries')
ON CONFLICT (card_template_id, category_id) DO NOTHING;
